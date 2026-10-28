import { nowIso } from '@/lib/dates';
import { newId } from '@/lib/ids';

import { getDb } from './client';

/** Gravação mensal: a mesma pergunta todo mês, para comparar a fala ao longo do tempo. */
export type SpeakingRecording = {
  id: string;
  /** YYYY-MM */
  month: string;
  question: string;
  /** Arquivo de áudio local (não vai para o backup). */
  audioPath: string | null;
  transcript: string;
  durationMs: number;
  createdAt: string;
};

export async function insertRecording(r: Omit<SpeakingRecording, 'id' | 'createdAt'>): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    'INSERT INTO speaking_recordings (id, month, question, audioPath, transcript, durationMs, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id,
    r.month,
    r.question,
    r.audioPath,
    r.transcript,
    r.durationMs,
    nowIso(),
  );
  return id;
}

export async function updateRecordingTranscript(id: string, transcript: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE speaking_recordings SET transcript = ? WHERE id = ?', transcript, id);
}

export async function listRecordings(): Promise<SpeakingRecording[]> {
  const db = await getDb();
  return db.getAllAsync<SpeakingRecording>('SELECT * FROM speaking_recordings ORDER BY createdAt DESC');
}

export async function getRecording(id: string): Promise<SpeakingRecording | null> {
  const db = await getDb();
  return db.getFirstAsync<SpeakingRecording>('SELECT * FROM speaking_recordings WHERE id = ?', id);
}

export async function deleteRecording(id: string): Promise<SpeakingRecording | null> {
  const existing = await getRecording(id);
  const db = await getDb();
  await db.runAsync('DELETE FROM speaking_recordings WHERE id = ?', id);
  return existing;
}

export async function restoreRecording(r: SpeakingRecording): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR IGNORE INTO speaking_recordings (id, month, question, audioPath, transcript, durationMs, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    r.id,
    r.month,
    r.question,
    r.audioPath,
    r.transcript,
    r.durationMs,
    r.createdAt,
  );
}
