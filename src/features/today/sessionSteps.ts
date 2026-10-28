import { getActivity, type DailyActivity } from '@/db/activityRepo';
import { computeTodayQueue, currentStudyDay, SECONDS_PER_CARD } from '@/features/review/reviewService';
import { strings } from '@/i18n/strings';
import { formatMinutes } from '@/lib/format';

export type SessionStepInfo = {
  key: string;
  label: string;
  /** "24 · ~8 min" */
  meta: string;
  done: boolean;
  href: string;
};

type StepProvider = (ctx: { activity: DailyActivity; day: string }) => Promise<SessionStepInfo | null>;

/** Etapas extras da sessão (Desafio e Diário entram na Fase 5). */
const extraSteps: StepProvider[] = [];

export function registerSessionStep(provider: StepProvider): void {
  extraSteps.push(provider);
}

export type TodayReview = { count: number; returnMode: boolean };

/** Etapas da sessão de hoje, na ordem (seção 8.1). */
export async function loadSessionSteps(): Promise<SessionStepInfo[]> {
  const day = currentStudyDay();
  const [activity, queue] = await Promise.all([getActivity(day), computeTodayQueue()]);
  const count = queue.cards.length;
  const reviewDone = activity.sessionSteps.review === 'done' || (count === 0 && activity.reviews > 0);
  const s = strings.today.session;

  const steps: SessionStepInfo[] = [
    {
      key: 'review',
      label: s.review,
      meta: count > 0 ? s.reviewMeta(count, formatMinutes(count * SECONDS_PER_CARD)) : s.nothingToReview,
      done: reviewDone || count === 0,
      href: '/review',
    },
  ];
  for (const provider of extraSteps) {
    const step = await provider({ activity, day });
    if (step) steps.push(step);
  }
  return steps;
}
