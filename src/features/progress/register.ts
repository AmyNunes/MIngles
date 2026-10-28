import { setAvoidedStructuresProvider } from '@/features/production/challengeService';
import { categoryLabel } from '@/features/errors/taxonomy';
import { enableNotificationTypes, registerPlanProvider } from '@/notifications/scheduler';

import { avoidedStructures, computeWeekStats, currentWeekStart } from './progressService';

let registered = false;

/** Fase 6: notificação do Resumo semanal e "estruturas evitadas" no Desafio do dia. */
export function registerProgress(): void {
  if (registered) return;
  registered = true;
  enableNotificationTypes(['weekly']);
  setAvoidedStructuresProvider(avoidedStructures);
  registerPlanProvider(async (now) => {
    const stats = await computeWeekStats(currentWeekStart(now));
    const top = stats.topCategories[0];
    return { weeklyStats: { reviews: stats.reviews, topCategory: top ? categoryLabel(top.category) : undefined } };
  });
}
