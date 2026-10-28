import { z } from 'zod';

import { avoidanceReport, weeklySummary } from '@/ai/functions/progress';
import { avoidanceReportSchema, type AvoidanceReport } from '@/ai/schemas/progress';
import { getActivityRange, isActiveDay } from '@/db/activityRepo';
import { usageByFeatureSince, usageTotalsSince } from '@/db/aiUsageRepo';
import { errorCountsSince } from '@/db/errorsRepo';
import { writtenTextsSince } from '@/db/productionRepo';
import {
  activeWeekStarts,
  getWeeklySummary,
  learnedTermsCount,
  listWeeklySummaries,
  reviewTotalsBetween,
  saveWeeklySummary,
  totalWordsWritten,
} from '@/db/progressRepo';
import { reviewsPerDay, retentionSince } from '@/db/reviewLogsRepo';
import { readAllSettings, writeSetting } from '@/db/settingsRepo';
import { computeTodayQueue, currentStudyDay } from '@/features/review/reviewService';
import { addDays, DAY, localDateKey, parseDateKey, startOfMonth, startOfWeek } from '@/lib/dates';
import { parseJsonWith } from '@/lib/json';
import { useSettings } from '@/stores/settingsStore';

import {
  AVOIDANCE_MIN_WORDS,
  notebookWithTrend,
  sampleSentences,
  weekStatsFrom,
  wordUsage,
  type WeekStats,
} from './stats';

export const CHART_DAYS = 14;

/* ---------- Tela de Progresso ---------- */

export async function loadProgress() {
  const now = new Date();
  const today = currentStudyDay(now);
  const chartFrom = localDateKey(addDays(parseDateKey(today), -(CHART_DAYS - 1)));
  const monthStart = startOfMonth(now);
  const fourWeeks = new Date(now.getTime() - 28 * DAY).toISOString();
  const twoWeeks = new Date(now.getTime() - 14 * DAY).toISOString();

  const [queue, retention, learned, monthActivity, perDay, recentErrors, olderErrors, words, weeks, summaries, spend, byFeature, avoidance] =
    await Promise.all([
      computeTodayQueue(now),
      retentionSince(new Date(now.getTime() - 30 * DAY).toISOString()),
      learnedTermsCount(),
      getActivityRange(localDateKey(monthStart), today),
      reviewsPerDay(chartFrom, today),
      errorCountsSince(twoWeeks),
      errorCountsSince(fourWeeks, twoWeeks),
      totalWordsWritten(),
      activeWeekStarts(12),
      listWeeklySummaries(),
      usageTotalsSince(monthStart.toISOString()),
      usageByFeatureSince(monthStart.toISOString()),
      loadAvoidance(),
    ]);

  const counts = new Map(perDay.map((d) => [d.studyDay, d.n]));
  const chart = Array.from({ length: CHART_DAYS }, (_, i) => {
    const key = localDateKey(addDays(parseDateKey(chartFrom), i));
    return { day: key, reviews: counts.get(key) ?? 0 };
  });
  const summarized = new Set(summaries.map((s) => s.weekStart));

  return {
    dueToday: queue.cards.length,
    retention: retention.total ? retention.good / retention.total : null,
    learned,
    activeDaysMonth: monthActivity.filter(isActiveDay).length,
    chart,
    notebook: notebookWithTrend(recentErrors, olderErrors),
    wordsWritten: words,
    avoidance,
    weeks: weeks.map((w) => ({ weekStart: w, summary: summaries.find((s) => s.weekStart === w) ?? null, summarized: summarized.has(w) })),
    spend: { cost: spend.cost, calls: spend.calls, limit: useSettings.getState().ai.monthlyLimit, byFeature },
  };
}

export type ProgressData = Awaited<ReturnType<typeof loadProgress>>;

/* ---------- Resumo semanal ---------- */

export function currentWeekStart(now = new Date()): string {
  return localDateKey(startOfWeek(parseDateKey(currentStudyDay(now))));
}

export async function computeWeekStats(weekStart: string): Promise<WeekStats> {
  const start = parseDateKey(weekStart);
  const weekEnd = localDateKey(addDays(start, 6));
  const [activity, reviewTotals, errors] = await Promise.all([
    getActivityRange(weekStart, weekEnd),
    reviewTotalsBetween(weekStart, weekEnd),
    errorCountsSince(start.toISOString(), addDays(start, 7).toISOString()),
  ]);
  return weekStatsFrom({ weekStart, weekEnd, activity, reviewTotals, errors });
}

/** Resumo da semana: gerado na primeira abertura (ou ao pedir "Atualizar"). */
export async function getOrCreateWeeklySummary(weekStart: string, refresh = false) {
  const existing = await getWeeklySummary(weekStart);
  if (existing && !refresh) return existing;
  const stats = await computeWeekStats(weekStart);
  const text = await weeklySummary(stats);
  await saveWeeklySummary({ weekStart, stats, ...text });
  return getWeeklySummary(weekStart);
}

/* ---------- Palavras que você evita ---------- */

const AVOIDANCE_KEY = 'avoidanceReport';
const storedSchema = z.object({ createdAt: z.string(), wordsAt: z.number(), report: avoidanceReportSchema });
type StoredAvoidance = z.infer<typeof storedSchema>;

export async function loadAvoidance(): Promise<StoredAvoidance | null> {
  const raw = await readAllSettings();
  return parseJsonWith<StoredAvoidance | null>(raw[AVOIDANCE_KEY], storedSchema, null);
}

export async function generateAvoidance(): Promise<StoredAvoidance> {
  const texts = await writtenTextsSince(new Date(Date.now() - 90 * DAY).toISOString());
  const usage = wordUsage(texts);
  const report: AvoidanceReport = await avoidanceReport({
    totalWords: usage.totalWords,
    counts: usage.counts,
    sentences: sampleSentences(texts),
  });
  const stored = { createdAt: new Date().toISOString(), wordsAt: await totalWordsWritten(), report };
  await writeSetting(AVOIDANCE_KEY, stored);
  return stored;
}

export async function avoidedStructures(): Promise<string[]> {
  return (await loadAvoidance())?.report.avoidedStructures.map((s) => s.structure) ?? [];
}

export { AVOIDANCE_MIN_WORDS };
