import { z } from 'zod';

import { editSchema, requiredItemSchema, type Edit, type RequiredItem } from '@/ai/schemas/production';
import { newId } from '@/lib/ids';
import { nowIso } from '@/lib/dates';
import { parseJsonWith } from '@/lib/json';

import { getDb } from './client';

/* ---------- Diário ---------- */

export type JournalEntry = {
  id: string;
  date: string;
  original: string;
  correctionId: string | null;
  wordCount: number;
  updatedAt: string;
};

export async function getJournalEntry(date: string): Promise<JournalEntry | null> {
  const db = await getDb();
  return db.getFirstAsync<JournalEntry>('SELECT * FROM journal_entries WHERE date = ?', date);
}

export async function saveJournalEntry(e: { date: string; original: string; correctionId: string | null; wordCount: number }): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO journal_entries (id, date, original, correctionId, wordCount, updatedAt) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET original = excluded.original, correctionId = excluded.correctionId,
       wordCount = excluded.wordCount, updatedAt = excluded.updatedAt`,
    newId(),
    e.date,
    e.original,
    e.correctionId,
    e.wordCount,
    nowIso(),
  );
}

export type JournalWithCorrection = JournalEntry & { correctedText: string | null };

export async function recentJournalEntries(limit: number): Promise<JournalWithCorrection[]> {
  const db = await getDb();
  return db.getAllAsync<JournalWithCorrection>(
    `SELECT j.*, c.correctedText AS correctedText FROM journal_entries j
     LEFT JOIN corrections c ON c.id = j.correctionId ORDER BY j.date DESC LIMIT ?`,
    limit,
  );
}

/** Textos escritos (para "palavras que você evita"). */
export async function writtenTextsSince(sinceIso: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ t: string }>(
    `SELECT original AS t FROM corrections WHERE createdAt >= ? AND origin != 'conversation'
     UNION ALL SELECT messages AS t FROM conversations WHERE createdAt >= ?`,
    sinceIso,
    sinceIso,
  );
  return rows.map((r) => r.t);
}

/* ---------- Desafio do dia ---------- */

export type Challenge = {
  id: string;
  date: string;
  promptPt: string;
  requiredItems: RequiredItem[];
  exampleAnswer: string;
  response: string | null;
  correctionId: string | null;
  completedAt: string | null;
};

type ChallengeRow = Omit<Challenge, 'requiredItems'> & { requiredItems: string };

const toChallenge = (r: ChallengeRow): Challenge => ({
  ...r,
  requiredItems: parseJsonWith(r.requiredItems, z.array(requiredItemSchema), []),
});

export async function getChallenge(date: string): Promise<Challenge | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ChallengeRow>('SELECT * FROM challenges WHERE date = ?', date);
  return row ? toChallenge(row) : null;
}

export async function createChallenge(c: { date: string; promptPt: string; requiredItems: RequiredItem[]; exampleAnswer: string }): Promise<Challenge> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO challenges (id, date, promptPt, requiredItems, exampleAnswer) VALUES (?, ?, ?, ?, ?)`,
    newId(),
    c.date,
    c.promptPt,
    JSON.stringify(c.requiredItems),
    c.exampleAnswer,
  );
  const saved = await getChallenge(c.date);
  if (!saved) throw new Error('challenge not saved');
  return saved;
}

export async function completeChallenge(date: string, response: string, correctionId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE challenges SET response = ?, correctionId = ?, completedAt = ? WHERE date = ?',
    response,
    correctionId,
    nowIso(),
    date,
  );
}

/* ---------- Conversa ---------- */

export const conversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string(),
  corrections: z.array(editSchema).default([]),
});
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;

export type Conversation = {
  id: string;
  topic: string;
  messages: ConversationMessage[];
  createdAt: string;
  endedAt: string | null;
  correctionId: string | null;
};

export async function createConversation(topic: string): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync('INSERT INTO conversations (id, topic, messages, createdAt) VALUES (?, ?, ?, ?)', id, topic, '[]', nowIso());
  return id;
}

export async function saveConversationMessages(id: string, messages: ConversationMessage[]): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE conversations SET messages = ? WHERE id = ?', JSON.stringify(messages), id);
}

export async function endConversation(id: string, correctionId: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE conversations SET endedAt = ?, correctionId = ? WHERE id = ?', nowIso(), correctionId, id);
}

/* ---------- Treino de erros ---------- */

export async function saveQuizSession(q: { questions: unknown; answers: unknown; score: number }): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO quiz_sessions (id, questions, answers, score, createdAt) VALUES (?, ?, ?, ?, ?)',
    newId(),
    JSON.stringify(q.questions),
    JSON.stringify(q.answers),
    q.score,
    nowIso(),
  );
}

export type { Edit };
