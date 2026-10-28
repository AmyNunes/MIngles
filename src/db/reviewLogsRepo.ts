import { newId } from '@/lib/ids';
import { schedulingStateSchema, type SchedulingStateSnapshot } from '@/srs/snapshot';

import { getDb } from './client';

export type NewReviewLog = {
  cardId: string;
  noteId: string;
  rating: number;
  reviewedAt: string;
  studyDay: string;
  durationMs: number;
  wasNew: boolean;
  prevCard: SchedulingStateSnapshot;
};

export async function insertReviewLog(log: NewReviewLog): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO review_logs (id, cardId, noteId, rating, reviewedAt, studyDay, durationMs, wasNew, prevCard)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    log.cardId,
    log.noteId,
    log.rating,
    log.reviewedAt,
    log.studyDay,
    log.durationMs,
    log.wasNew ? 1 : 0,
    JSON.stringify(log.prevCard),
  );
  return id;
}

export type StoredReviewLog = Omit<NewReviewLog, 'prevCard' | 'wasNew'> & {
  id: string;
  wasNew: boolean;
  prevCard: SchedulingStateSnapshot | null;
};

export async function getReviewLog(id: string): Promise<StoredReviewLog | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Omit<StoredReviewLog, 'prevCard' | 'wasNew'> & { prevCard: string; wasNew: number }>(
    'SELECT id, cardId, noteId, rating, reviewedAt, studyDay, durationMs, wasNew, prevCard FROM review_logs WHERE id = ?',
    id,
  );
  if (!row) return null;
  let prev: SchedulingStateSnapshot | null = null;
  try {
    const parsed = schedulingStateSchema.safeParse(JSON.parse(row.prevCard));
    prev = parsed.success ? parsed.data : null;
  } catch {
    prev = null;
  }
  return { ...row, wasNew: row.wasNew === 1, prevCard: prev };
}

export async function deleteReviewLog(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM review_logs WHERE id = ?', id);
}

export type TodayReviewStats = {
  reviewsDone: number;
  newDone: number;
  seen: Map<string, Set<string>>;
};

/** O que já foi revisado no dia de estudo (para a fila e os irmãos). */
export async function todayReviewStats(studyDay: string): Promise<TodayReviewStats> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ cardId: string; noteId: string; wasNew: number }>(
    'SELECT cardId, noteId, wasNew FROM review_logs WHERE studyDay = ?',
    studyDay,
  );
  const seen = new Map<string, Set<string>>();
  const firstByCard = new Map<string, boolean>();
  for (const r of rows) {
    if (!seen.has(r.noteId)) seen.set(r.noteId, new Set());
    seen.get(r.noteId)?.add(r.cardId);
    if (!firstByCard.has(r.cardId)) firstByCard.set(r.cardId, r.wasNew === 1);
  }
  let newDone = 0;
  let reviewsDone = 0;
  for (const wasNew of firstByCard.values()) {
    if (wasNew) newDone++;
    else reviewsDone++;
  }
  return { reviewsDone, newDone, seen };
}

export async function totalReviewCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM review_logs');
  return row?.n ?? 0;
}

/** Revisões por dia de estudo, num intervalo (para gráficos e resumos). */
export async function reviewsPerDay(fromDay: string, toDay: string): Promise<{ studyDay: string; n: number; good: number }[]> {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT studyDay, COUNT(*) AS n, SUM(CASE WHEN rating >= 3 THEN 1 ELSE 0 END) AS good
     FROM review_logs WHERE studyDay >= ? AND studyDay <= ?
     GROUP BY studyDay ORDER BY studyDay`,
    fromDay,
    toDay,
  );
}

/** Retenção: % de Bom/Fácil em cards que já não eram novos, a partir de uma data. */
export async function retentionSince(sinceIso: string): Promise<{ total: number; good: number }> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number; good: number }>(
    `SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN rating >= 3 THEN 1 ELSE 0 END), 0) AS good
     FROM review_logs WHERE wasNew = 0 AND reviewedAt >= ?`,
    sinceIso,
  );
  return row ?? { total: 0, good: 0 };
}
