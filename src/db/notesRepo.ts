import {
  errorDataSchema,
  explainMoreSchema,
  productionDataSchema,
  termDataSchema,
  type CardType,
  type ExplainMore,
  type Note,
  type NoteContent,
  type NoteKind,
} from '@/features/cards/model';
import { newId } from '@/lib/ids';
import { nowIso } from '@/lib/dates';
import { parseJsonWith } from '@/lib/json';
import { newSchedulingState } from '@/srs/fsrs';

import { getDb } from './client';
import type { Db } from './types';

export type NoteRow = {
  id: string;
  kind: string;
  term: string;
  lemma: string;
  data: string;
  sourceId: string | null;
  sourceLabel: string | null;
  extra: string | null;
  createdAt: string;
  updatedAt: string;
};

export const NOTE_COLUMNS = 'id, kind, term, lemma, data, sourceId, sourceLabel, extra, createdAt, updatedAt';

/** Converte uma linha do banco numa nota tipada (ou `null` se estiver corrompida). */
export function rowToNote(row: NoteRow): Note | null {
  let raw: unknown;
  try {
    raw = JSON.parse(row.data);
  } catch {
    return null;
  }
  const base = {
    id: row.id,
    term: row.term,
    lemma: row.lemma,
    sourceId: row.sourceId,
    sourceLabel: row.sourceLabel,
    extra: parseJsonWith<ExplainMore | null>(row.extra, explainMoreSchema, null),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  if (row.kind === 'term') {
    const data = termDataSchema.safeParse(raw);
    return data.success ? { ...base, kind: 'term', data: data.data } : null;
  }
  if (row.kind === 'production') {
    const data = productionDataSchema.safeParse(raw);
    return data.success ? { ...base, kind: 'production', data: data.data } : null;
  }
  if (row.kind === 'error') {
    const data = errorDataSchema.safeParse(raw);
    return data.success ? { ...base, kind: 'error', data: data.data } : null;
  }
  return null;
}

export type NewNote = NoteContent & {
  sourceId?: string | null;
  sourceLabel?: string | null;
};

async function insertNote(db: Db, note: NewNote, cardTypes: CardType[], now: Date): Promise<string> {
  const id = newId();
  const at = now.toISOString();
  await db.runAsync(
    `INSERT INTO notes (${NOTE_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    id,
    note.kind,
    note.term,
    note.lemma,
    JSON.stringify(note.data),
    note.sourceId ?? null,
    note.sourceLabel ?? null,
    at,
    at,
  );
  const s = newSchedulingState(now);
  for (const type of cardTypes) {
    await db.runAsync(
      `INSERT INTO cards (id, noteId, type, due, stability, difficulty, elapsedDays, scheduledDays,
                          learningSteps, reps, lapses, state, lastReview, suspended, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      newId(),
      id,
      type,
      s.due,
      s.stability,
      s.difficulty,
      s.elapsedDays,
      s.scheduledDays,
      s.learningSteps,
      s.reps,
      s.lapses,
      s.state,
      s.lastReview,
      at,
    );
  }
  return id;
}

/** Cria uma nota e seus cards (1 ou 2) numa transação. Devolve o id da nota. */
export async function createNoteWithCards(note: NewNote, cardTypes: CardType[]): Promise<string> {
  const db = await getDb();
  let id = '';
  await db.withTransactionAsync(async () => {
    id = await insertNote(db, note, cardTypes, new Date());
  });
  return id;
}

/** Várias notas de uma vez (ex.: "Salvar 3 cards"). */
export async function createNotesWithCards(
  items: { note: NewNote; cardTypes: CardType[] }[],
): Promise<string[]> {
  const db = await getDb();
  const ids: string[] = [];
  await db.withTransactionAsync(async () => {
    for (const item of items) ids.push(await insertNote(db, item.note, item.cardTypes, new Date()));
  });
  return ids;
}

export async function getNote(id: string): Promise<Note | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<NoteRow>(`SELECT ${NOTE_COLUMNS} FROM notes WHERE id = ?`, id);
  return row ? rowToNote(row) : null;
}

export async function findNotesByLemma(lemma: string, kind: NoteKind): Promise<Note[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<NoteRow>(
    `SELECT ${NOTE_COLUMNS} FROM notes WHERE lemma = ? AND kind = ? ORDER BY createdAt`,
    lemma,
    kind,
  );
  return rows.map(rowToNote).filter((n): n is Note => n != null);
}

export async function updateNote(
  id: string,
  patch: { term?: string; lemma?: string; data?: Note['data']; extra?: ExplainMore | null },
): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const params: (string | null)[] = [];
  if (patch.term !== undefined) {
    sets.push('term = ?');
    params.push(patch.term);
  }
  if (patch.lemma !== undefined) {
    sets.push('lemma = ?');
    params.push(patch.lemma);
  }
  if (patch.data !== undefined) {
    sets.push('data = ?');
    params.push(JSON.stringify(patch.data));
  }
  if (patch.extra !== undefined) {
    sets.push('extra = ?');
    params.push(patch.extra ? JSON.stringify(patch.extra) : null);
  }
  if (!sets.length) return;
  sets.push('updatedAt = ?');
  params.push(nowIso());
  await db.runAsync(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`, ...params, id);
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM notes WHERE id = ?', id);
}

export async function countNotes(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM notes');
  return row?.n ?? 0;
}

/** Lemas salvos e o estado de aprendizado (para o realce do Leitor). */
export async function savedLemmaStates(): Promise<{ lemma: string; maxStability: number; minState: number }[]> {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT n.lemma AS lemma, MAX(c.stability) AS maxStability, MIN(c.state) AS minState
     FROM notes n JOIN cards c ON c.noteId = n.id
     WHERE n.kind = 'term'
     GROUP BY n.lemma`,
  );
}

/** Formas salvas (lema e termo) de cada nota de termo, com o quanto já sei (estabilidade em dias). */
export async function savedTermForms(): Promise<{ lemma: string; term: string; maxStability: number; minState: number }[]> {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT n.lemma AS lemma, n.term AS term, MAX(c.stability) AS maxStability, MIN(c.state) AS minState
     FROM notes n JOIN cards c ON c.noteId = n.id
     WHERE n.kind = 'term' AND c.suspended = 0
     GROUP BY n.id`,
  );
}

/** Termos em estudo (aprendendo/revisão), dos mais recentes, para o Desafio do dia. */
/** Notas sorteadas (frases para o Shadowing). */
export async function randomNotes(limit: number): Promise<Note[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<NoteRow>(`SELECT ${NOTE_COLUMNS} FROM notes ORDER BY RANDOM() LIMIT ?`, limit);
  return rows.map(rowToNote).filter((n): n is Note => n != null);
}

export async function recentStudyTerms(limit: number): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ term: string }>(
    `SELECT n.term AS term, MAX(c.lastReview) AS last FROM notes n JOIN cards c ON c.noteId = n.id
     WHERE n.kind = 'term' AND c.state IN (1, 2, 3) AND c.suspended = 0
     GROUP BY n.id ORDER BY last DESC LIMIT ?`,
    limit,
  );
  return rows.map((r) => r.term);
}
