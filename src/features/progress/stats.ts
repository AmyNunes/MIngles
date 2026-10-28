import { z } from 'zod';

import type { DailyActivity } from '@/db/activityRepo';
import type { CategoryCount } from '@/db/errorsRepo';

/** Números de uma semana, calculados no aparelho (a IA só escreve o resumo). */
export const weekStatsSchema = z.object({
  weekStart: z.string(),
  weekEnd: z.string(),
  reviews: z.number(),
  /** % de Bom/Fácil (0–1). */
  accuracy: z.number(),
  newCards: z.number(),
  wordsWritten: z.number(),
  activeDays: z.number(),
  topCategories: z.array(z.object({ category: z.string(), n: z.number() })),
});
export type WeekStats = z.infer<typeof weekStatsSchema>;

export function weekStatsFrom(input: {
  weekStart: string;
  weekEnd: string;
  activity: DailyActivity[];
  reviewTotals: { total: number; good: number };
  errors: CategoryCount[];
}): WeekStats {
  const sum = (k: 'reviews' | 'newCards' | 'wordsWritten') => input.activity.reduce((s, a) => s + a[k], 0);
  return {
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
    reviews: sum('reviews'),
    accuracy: input.reviewTotals.total ? input.reviewTotals.good / input.reviewTotals.total : 0,
    newCards: sum('newCards'),
    wordsWritten: sum('wordsWritten'),
    activeDays: input.activity.filter((a) => a.reviews > 0 || a.wordsWritten > 0 || a.minimalDay).length,
    topCategories: input.errors.slice(0, 3),
  };
}

export type Trend = 'up' | 'down' | 'flat';

/** Tendência de uma categoria nas últimas 4 semanas: 2 recentes × 2 anteriores. */
export function trendOf(recent: number, older: number): Trend {
  if (recent === older) return 'flat';
  if (older === 0) return recent > 0 ? 'up' : 'flat';
  const ratio = recent / older;
  if (ratio >= 1.25) return 'up';
  if (ratio <= 0.8) return 'down';
  return 'flat';
}

/** Junta as contagens das duas metades do período por categoria. */
export function notebookWithTrend(recent: CategoryCount[], older: CategoryCount[]) {
  const map = new Map<string, { recent: number; older: number }>();
  for (const c of recent) map.set(c.category, { recent: c.n, older: 0 });
  for (const c of older) map.set(c.category, { recent: map.get(c.category)?.recent ?? 0, older: c.n });
  return [...map.entries()]
    .map(([category, v]) => ({ category, total: v.recent + v.older, trend: trendOf(v.recent, v.older) }))
    .sort((a, b) => b.total - a.total);
}

/** Palavras que costumam ser "muletas" de quem está no intermediário. */
export const CRUTCH_WORDS = [
  'very',
  'really',
  'good',
  'bad',
  'nice',
  'thing',
  'things',
  'stuff',
  'get',
  'got',
  'big',
  'a lot',
  'so',
  'just',
  'like',
  'go',
  'make',
  'do',
  'think',
  'many',
] as const;

/** Estatística local de uso de palavras (só ela e algumas frases vão para a IA). */
export function wordUsage(texts: string[]): { totalWords: number; counts: { word: string; count: number }[] } {
  const all = texts.join('\n').toLowerCase();
  const words = all.match(/[a-z']+/g) ?? [];
  const counts = CRUTCH_WORDS.map((word) => {
    const re = new RegExp(`(?<![a-z'])${word.replace(' ', '\\s+')}(?![a-z'])`, 'g');
    return { word: word as string, count: (all.match(re) ?? []).length };
  })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
  return { totalWords: words.length, counts };
}

/** Algumas frases de amostra (as mais longas e variadas) para a IA. */
export function sampleSentences(texts: string[], max = 12): string[] {
  const sentences = texts
    .flatMap((t) => t.split(/(?<=[.!?])\s+|\n+/))
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 5);
  const unique = [...new Set(sentences)];
  const step = Math.max(1, Math.floor(unique.length / max));
  return unique.filter((_, i) => i % step === 0).slice(0, max);
}

export const AVOIDANCE_MIN_WORDS = 1000;
