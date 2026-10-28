import { router } from 'expo-router';

import { useLoader } from '@/lib/useLoader';

import { loadSessionSteps } from './sessionSteps';

/**
 * Depois de uma etapa, qual é a próxima pendente da sessão do dia
 * ("Próxima etapa: Desafio do dia").
 */
export function useNextSessionStep(enabled: boolean, current: string = 'review') {
  const { state } = useLoader(async () => (enabled ? loadSessionSteps() : []), enabled ? 1 : 0);
  if (!enabled || state.status !== 'success') return undefined;
  const steps = state.data;
  const index = steps.findIndex((s) => s.key === current);
  const next = steps.slice(index + 1).find((s) => !s.done) ?? steps.find((s) => !s.done && s.key !== current);
  if (!next) return undefined;
  return { label: next.label, onPress: () => router.replace(next.href) };
}
