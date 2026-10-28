import { dailyChallenge } from '@/ai/functions/production';
import type { RequiredItem } from '@/ai/schemas/production';
import { errorCountsSince } from '@/db/errorsRepo';
import { recentStudyTerms } from '@/db/notesRepo';
import { createChallenge, getChallenge, type Challenge } from '@/db/productionRepo';
import { categoryLabel } from '@/features/errors/taxonomy';
import { currentStudyDay } from '@/features/review/reviewService';
import { DAY } from '@/lib/dates';

type AvoidedProvider = () => Promise<string[]>;
let avoidedStructures: AvoidedProvider = async () => [];

/** "Palavras que você evita" (Fase 6) informa as estruturas evitadas. */
export function setAvoidedStructuresProvider(provider: AvoidedProvider): void {
  avoidedStructures = provider;
}

/** Desafio do dia: gerado uma vez por dia, na primeira abertura, e guardado (seção 8.5). */
export async function getOrCreateTodayChallenge(): Promise<Challenge> {
  const day = currentStudyDay();
  const existing = await getChallenge(day);
  if (existing) return existing;

  const since = new Date(Date.now() - 30 * DAY).toISOString();
  const [terms, counts, avoided] = await Promise.all([
    recentStudyTerms(10),
    errorCountsSince(since),
    avoidedStructures().catch(() => []),
  ]);
  const generated = await dailyChallenge({
    reviewingTerms: terms,
    frequentCategories: counts.slice(0, 3).map((c) => categoryLabel(c.category)),
    avoidedStructures: avoided,
  });
  return createChallenge({ date: day, ...generated });
}

/** Micro-desafio do dia mínimo: 1 frase com um termo em estudo (sem chamar a IA). */
export async function microChallenge(): Promise<RequiredItem | null> {
  const [term] = await recentStudyTerms(5);
  return term ? { text: term, kind: 'term' } : null;
}
