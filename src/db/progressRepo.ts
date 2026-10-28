import { weekStatsSchema, type WeekStats } from '@/features/progress/stats';
import { newId } from '@/lib/ids';
import { nowIso } from '@/lib/dates';
import { parseJsonWith } from '@/lib/json';

import { getDb } from './client';

/** Termos aprendidos: notas de termo com algum card já em "Revisão" (passou do aprendizado). */
export async function learnedTermsCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(DISTINCT n.id) AS n FROM notes n JOIN cards c ON c.noteId = n.id WHERE n.kind = 'term' AND c.state = 2`,
  );
  return row?.n ?? 0;
}

export async function reviewTotalsBetween(fromDay: string, toDay: string): Promise<{ total: number; good: number }> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number; good: number }>(
    `SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN rating >= 3 THEN 1 ELSE 0 END), 0) AS good
     FROM review_logs WHERE studyDay >= ? AND studyDay <= ?`,
    fromDay,
    toDay,
  );
  return row ?? { total: 0, good: 0 };
}

export async function totalWordsWritten(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COALESCE(SUM(wordsWritten), 0) AS n FROM daily_activity');
  return row?.n ?? 0;
}

/** Semanas (segunda) com alguma atividade, da mais recente para a mais antiga. */
export async function activeWeekStarts(limit: number): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ date: string }>(
    'SELECT date FROM daily_activity WHERE reviews > 0 OR wordsWritten > 0 OR minimalDay = 1 ORDER BY date DESC',
  );
  const weeks: string[] = [];
  for (const { date } of rows) {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!weeks.includes(key)) weeks.push(key);
    if (weeks.length >= limit) break;
  }
  return weeks;
}

/* ---------- Resumos semanais ---------- */

export type WeeklySummary = {
  id: string;
  weekStart: string;
  stats: WeekStats;
  summaryPt: string;
  focusNextWeekPt: string;
  createdAt: string;
};

type Row = Omit<WeeklySummary, 'stats'> & { stats: string };

const fallbackStats = (weekStart: string): WeekStats => ({
  weekStart,
  weekEnd: weekStart,
  reviews: 0,
  accuracy: 0,
  newCards: 0,
  wordsWritten: 0,
  activeDays: 0,
  topCategories: [],
});

const toSummary = (r: Row): WeeklySummary => ({ ...r, stats: parseJsonWith(r.stats, weekStatsSchema, fallbackStats(r.weekStart)) });

export async function getWeeklySummary(weekStart: string): Promise<WeeklySummary | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>('SELECT * FROM weekly_summaries WHERE weekStart = ?', weekStart);
  return row ? toSummary(row) : null;
}

export async function listWeeklySummaries(): Promise<WeeklySummary[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>('SELECT * FROM weekly_summaries ORDER BY weekStart DESC');
  return rows.map(toSummary);
}

export async function saveWeeklySummary(s: Omit<WeeklySummary, 'id' | 'createdAt'>): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO weekly_summaries (id, weekStart, stats, summaryPt, focusNextWeekPt, createdAt) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(weekStart) DO UPDATE SET stats = excluded.stats, summaryPt = excluded.summaryPt,
       focusNextWeekPt = excluded.focusNextWeekPt, createdAt = excluded.createdAt`,
    newId(),
    s.weekStart,
    JSON.stringify(s.stats),
    s.summaryPt,
    s.focusNextWeekPt,
    nowIso(),
  );
}

