import { z } from 'zod';

import { parseJsonWith } from '@/lib/json';

import { getDb } from './client';

/** Etapas da sessão do dia (Hoje). */
export const SESSION_STEPS = ['review', 'challenge', 'journal'] as const;
export type SessionStep = (typeof SESSION_STEPS)[number];

const stepsSchema = z.record(z.string(), z.enum(['done']));
export type SessionSteps = Partial<Record<SessionStep, 'done'>>;

export type DailyActivity = {
  date: string;
  reviews: number;
  newCards: number;
  wordsWritten: number;
  minimalDay: boolean;
  sessionSteps: SessionSteps;
};

type Row = Omit<DailyActivity, 'minimalDay' | 'sessionSteps'> & { minimalDay: number; sessionSteps: string };

const toActivity = (row: Row): DailyActivity => ({
  ...row,
  minimalDay: row.minimalDay === 1,
  sessionSteps: parseJsonWith<SessionSteps>(row.sessionSteps, stepsSchema, {}),
});

const ensure = (date: string) =>
  getDb().then((db) =>
    db.runAsync('INSERT OR IGNORE INTO daily_activity (date) VALUES (?)', date).then(() => db),
  );

export async function getActivity(date: string): Promise<DailyActivity> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>('SELECT * FROM daily_activity WHERE date = ?', date);
  return row
    ? toActivity(row)
    : { date, reviews: 0, newCards: 0, wordsWritten: 0, minimalDay: false, sessionSteps: {} };
}

export async function getActivityRange(fromDate: string, toDate: string): Promise<DailyActivity[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM daily_activity WHERE date >= ? AND date <= ? ORDER BY date',
    fromDate,
    toDate,
  );
  return rows.map(toActivity);
}

/** +1 (ou −1, ao desfazer) revisão no dia. */
export async function addReview(date: string, wasNew: boolean, delta: 1 | -1): Promise<void> {
  const db = await ensure(date);
  await db.runAsync(
    `UPDATE daily_activity SET reviews = MAX(0, reviews + ?), newCards = MAX(0, newCards + ?) WHERE date = ?`,
    delta,
    wasNew ? delta : 0,
    date,
  );
}

export async function addWordsWritten(date: string, words: number): Promise<void> {
  const db = await ensure(date);
  await db.runAsync('UPDATE daily_activity SET wordsWritten = wordsWritten + ? WHERE date = ?', words, date);
}

export async function markMinimalDay(date: string): Promise<void> {
  const db = await ensure(date);
  await db.runAsync('UPDATE daily_activity SET minimalDay = 1 WHERE date = ?', date);
}

export async function markStepDone(date: string, step: SessionStep): Promise<void> {
  const current = await getActivity(date);
  if (current.sessionSteps[step] === 'done') return;
  const db = await ensure(date);
  await db.runAsync(
    'UPDATE daily_activity SET sessionSteps = ? WHERE date = ?',
    JSON.stringify({ ...current.sessionSteps, [step]: 'done' }),
    date,
  );
}

/** Dia ativo = qualquer revisão ou texto produzido (ou dia mínimo). */
export function isActiveDay(a: DailyActivity): boolean {
  return a.reviews > 0 || a.wordsWritten > 0 || a.minimalDay;
}

export async function lastActiveDate(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ date: string }>(
    'SELECT date FROM daily_activity WHERE reviews > 0 OR wordsWritten > 0 OR minimalDay = 1 ORDER BY date DESC LIMIT 1',
  );
  return row?.date ?? null;
}
