import type { ExplainMore, Note } from '@/features/cards/model';
import { normalizeLemma } from '@/features/cards/lemma';

import { peekCache, withCache } from '../cache';
import { callAI } from '../client';
import { loadUserContext } from '../context';
import { explainMorePrompt, explainTermPrompt, howDoISayPrompt } from '../prompts/cards';
import {
  explainMoreResultSchema,
  explainTermSchema,
  howDoISaySchema,
  type ExplainTermResult,
  type HowDoISayResult,
} from '../schemas/cards';

/** Explica um termo (com cache por termo + frase). */
export async function explainTerm(input: {
  term: string;
  sentence?: string;
}): Promise<{ data: ExplainTermResult; cached: boolean }> {
  const key = { term: normalizeLemma(input.term), sentence: input.sentence?.trim() ?? '' };
  return withCache('explainTerm', key, explainTermSchema, async () => {
    const ctx = await loadUserContext();
    const { data } = await callAI('explainTerm', explainTermPrompt(ctx, input), explainTermSchema);
    return data;
  });
}

/** "Como eu digo?": formas naturais em inglês para uma intenção em português. */
export async function howDoISay(input: { pt: string; context?: string }): Promise<HowDoISayResult> {
  const ctx = await loadUserContext();
  const { data } = await callAI('howDoISay', howDoISayPrompt(ctx, input), howDoISaySchema, {
    temperature: 0.6,
  });
  const bestIndex = Math.min(data.bestIndex, data.options.length - 1);
  return { ...data, bestIndex };
}

/** "Explicar mais (IA)" de um card. O resultado fica salvo na nota. */
export async function explainMore(note: Note): Promise<ExplainMore> {
  const ctx = await loadUserContext();
  const { data } = await callAI('explainMore', explainMorePrompt(ctx, note), explainMoreResultSchema);
  return data;
}

/** Explicação já guardada no cache (para o painel da palavra sem conexão). */
export async function cachedExplainTerm(input: { term: string; sentence?: string }): Promise<ExplainTermResult | null> {
  return peekCache('explainTerm', { term: normalizeLemma(input.term), sentence: input.sentence?.trim() ?? '' }, explainTermSchema);
}
