import { getActivityRange, isActiveDay } from '@/db/activityRepo';
import { errorCountsSince, latestErrorOf, type ErrorRow } from '@/db/errorsRepo';
import { countNotes } from '@/db/notesRepo';
import { upcomingRehearsals, type Rehearsal } from '@/db/rehearsalsRepo';
import { totalReviewCount } from '@/db/reviewLogsRepo';
import { computeTodayQueue, currentStudyDay } from '@/features/review/reviewService';
import { isAiConfigured } from '@/features/settings/useAiConfigured';
import { addDays, DAY, localDateKey, parseDateKey, startOfWeek } from '@/lib/dates';
import { useLoader } from '@/lib/useLoader';

import { loadSessionSteps, type SessionStepInfo } from './sessionSteps';

export type WeekDay = { key: string; weekday: number; state: 'active' | 'inactive' | 'future' | 'today' };

export type TodayData = {
  firstUse: { aiConfigured: boolean; hasNotes: boolean; hasReviewed: boolean } | null;
  steps: SessionStepInfo[];
  returnMode: boolean;
  returnCount: number;
  week: WeekDay[];
  errorOfWeek: { category: string; count: number; example: ErrorRow | null } | null;
  nextRehearsal: Rehearsal | null;
};

async function loadWeek(): Promise<WeekDay[]> {
  const today = currentStudyDay();
  const monday = startOfWeek(parseDateKey(today));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const activity = await getActivityRange(localDateKey(days[0]), localDateKey(days[6]));
  const active = new Set(activity.filter(isActiveDay).map((a) => a.date));
  return days.map((d) => {
    const key = localDateKey(d);
    const state = active.has(key) ? 'active' : key === today ? 'today' : key > today ? 'future' : 'inactive';
    return { key, weekday: d.getDay(), state };
  });
}

async function loadErrorOfWeek(): Promise<TodayData['errorOfWeek']> {
  const since = new Date(Date.now() - 7 * DAY).toISOString();
  const [top] = await errorCountsSince(since);
  if (!top) return null;
  return { category: top.category, count: top.n, example: await latestErrorOf(top.category, since) };
}

/** Próxima situação nos próximos 7 dias que ainda não ensaiei. */
async function loadNextRehearsal(): Promise<Rehearsal | null> {
  const now = Date.now();
  const items = await upcomingRehearsals(new Date(now).toISOString(), new Date(now + 7 * DAY).toISOString());
  return items.find((r) => !r.rehearsedAt) ?? null;
}

export async function loadToday(): Promise<TodayData> {
  const [aiConfigured, notes, reviews, steps, queue, week, errorOfWeek, nextRehearsal] = await Promise.all([
    isAiConfigured(),
    countNotes(),
    totalReviewCount(),
    loadSessionSteps(),
    computeTodayQueue(),
    loadWeek(),
    loadErrorOfWeek().catch(() => null),
    loadNextRehearsal().catch(() => null),
  ]);
  const firstUse = reviews === 0 ? { aiConfigured, hasNotes: notes > 0, hasReviewed: false } : null;
  return { firstUse, steps, returnMode: queue.returnMode, returnCount: queue.cards.length, week, errorOfWeek, nextRehearsal };
}

/** Dados da tela Hoje; recarrega ao voltar para ela e no "puxar para atualizar". */
export function useToday() {
  return useLoader(loadToday);
}
