import { newId } from '@/lib/ids';
import { nowIso } from '@/lib/dates';

import { getDb } from './client';

export type QueueItem = { id: string; feature: string; payload: string; createdAt: string };

/** Fila offline: "Salvar para explicar depois" (seção 8.4). */
export async function enqueueAi(feature: string, payload: unknown): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO ai_queue (id, feature, payload, createdAt) VALUES (?, ?, ?, ?)',
    newId(),
    feature,
    JSON.stringify(payload),
    nowIso(),
  );
}

export async function listAiQueue(): Promise<QueueItem[]> {
  const db = await getDb();
  return db.getAllAsync<QueueItem>('SELECT id, feature, payload, createdAt FROM ai_queue ORDER BY createdAt');
}

export async function removeFromAiQueue(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM ai_queue WHERE id = ?', id);
}

export async function countAiQueue(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM ai_queue');
  return row?.n ?? 0;
}
