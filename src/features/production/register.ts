import { setTopErrorsProvider } from '@/ai/context';
import { errorCountsSince } from '@/db/errorsRepo';
import { getChallenge, getJournalEntry } from '@/db/productionRepo';
import { registerSessionStep } from '@/features/today/sessionSteps';
import { strings } from '@/i18n/strings';
import { DAY, studyDayKey } from '@/lib/dates';
import { enableNotificationTypes, registerPlanProvider } from '@/notifications/scheduler';
import { useSettings } from '@/stores/settingsStore';

const s = strings.today.session;

let registered = false;

/** Liga Diário e Desafio a Hoje, às notificações e ao contexto da IA (Fase 5). */
export function registerProduction(): void {
  if (registered) return;
  registered = true;

  setTopErrorsProvider(async () => {
    const counts = await errorCountsSince(new Date(Date.now() - 30 * DAY).toISOString());
    return counts.slice(0, 3).map((c) => c.category);
  });

  registerSessionStep(async ({ activity, day }) => {
    const challenge = await getChallenge(day);
    return {
      key: 'challenge',
      label: s.challenge,
      meta: s.fiveMinutes,
      done: activity.sessionSteps.challenge === 'done' || Boolean(challenge?.completedAt),
      href: '/practice/challenge',
    };
  });

  registerSessionStep(async ({ activity, day }) => {
    const entry = await getJournalEntry(day);
    return {
      key: 'journal',
      label: s.journal,
      meta: s.fiveMinutes,
      done: activity.sessionSteps.journal === 'done' || Boolean(entry?.correctionId),
      href: '/practice/journal',
    };
  });

  enableNotificationTypes(['challenge', 'journal']);

  registerPlanProvider(async (now) => {
    const day = studyDayKey(now, useSettings.getState().study.rolloverHour);
    const challenge = await getChallenge(day);
    const items = challenge?.requiredItems.filter((i) => i.kind === 'term').map((i) => `"${i.text}"`);
    return {
      challengeItems: items,
      doneToday: {
        challenge: Boolean(challenge?.completedAt),
        journal: Boolean((await getJournalEntry(day))?.correctionId),
      },
    };
  });
}
