import { newId } from '@/lib/ids';
import type { SchedulingState } from '@/srs/fsrs';

import { getDb } from './client';
import { getReviewLog } from './reviewLogsRepo';
import type { Db } from './types';

async function setScheduling(db: Db, cardId: string, s: SchedulingState) {
  await db.runAsync(
    `UPDATE cards SET due = ?, stability = ?, difficulty = ?, elapsedDays = ?, scheduledDays = ?,
       learningSteps = ?, reps = ?, lapses = ?, state = ?, lastReview = ? WHERE id = ?`,
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
    cardId,
  );
}

async function bumpActivity(db: Db, day: string, wasNew: boolean, delta: 1 | -1) {
  await db.runAsync('INSERT OR IGNORE INTO daily_activity (date) VALUES (?)', day);
  await db.runAsync(
    'UPDATE daily_activity SET reviews = MAX(0, reviews + ?), newCards = MAX(0, newCards + ?) WHERE date = ?',
    delta,
    wasNew ? delta : 0,
    day,
  );
}

export type ApplyReviewInput = {
  cardId: string;
  noteId: string;
  rating: number;
  prev: SchedulingState;
  next: SchedulingState;
  reviewedAt: string;
  studyDay: string;
  durationMs: number;
};

/** Grava uma avaliação: nova agenda do card + registro (com o estado anterior) + atividade do dia. */
export async function applyReview(input: ApplyReviewInput): Promise<string> {
  const db = await getDb();
  const logId = newId();
  const wasNew = input.prev.state === 0;
  await db.withTransactionAsync(async () => {
    await setScheduling(db, input.cardId, input.next);
    await db.runAsync(
      `INSERT INTO review_logs (id, cardId, noteId, rating, reviewedAt, studyDay, durationMs, wasNew, prevCard)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      logId,
      input.cardId,
      input.noteId,
      input.rating,
      input.reviewedAt,
      input.studyDay,
      input.durationMs,
      wasNew ? 1 : 0,
      JSON.stringify(input.prev),
    );
    await bumpActivity(db, input.studyDay, wasNew, 1);
  });
  return logId;
}

/** Desfaz uma avaliação: restaura o card a partir de `prevCard` e apaga o registro. */
export async function undoReview(logId: string): Promise<SchedulingState | null> {
  const log = await getReviewLog(logId);
  if (!log?.prevCard) return null;
  const prev = log.prevCard;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await setScheduling(db, log.cardId, prev);
    await db.runAsync('DELETE FROM review_logs WHERE id = ?', logId);
    await bumpActivity(db, log.studyDay, log.wasNew, -1);
  });
  return prev;
}
