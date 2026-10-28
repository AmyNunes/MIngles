import type { ConversationMessage } from '@/db/productionRepo';

import { callAI } from '../client';
import { loadUserContext } from '../context';
import {
  conversationTurnPrompt,
  correctTextPrompt,
  dailyChallengePrompt,
  errorQuizPrompt,
  type CorrectionMode,
} from '../prompts/production';
import {
  conversationTurnSchema,
  correctTextSchema,
  dailyChallengeSchema,
  errorQuizSchema,
  type ConversationTurnResult,
  type CorrectTextResult,
  type DailyChallengeResult,
  type QuizQuestion,
  type RequiredItem,
} from '../schemas/production';

/** Corrige um texto (Diário, Desafio, Conversa, "Pense em inglês"). */
export async function correctText(input: {
  text: string;
  mode: CorrectionMode;
  requiredItems?: RequiredItem[];
}): Promise<CorrectTextResult> {
  const ctx = await loadUserContext();
  const { data } = await callAI('correctText', correctTextPrompt(ctx, input), correctTextSchema, { temperature: 0.2 });
  return data;
}

export async function dailyChallenge(input: {
  reviewingTerms: string[];
  frequentCategories: string[];
  avoidedStructures: string[];
}): Promise<DailyChallengeResult> {
  const ctx = await loadUserContext();
  const { data } = await callAI('dailyChallenge', dailyChallengePrompt(ctx, input), dailyChallengeSchema, {
    temperature: 0.8,
  });
  return data;
}

export async function errorQuiz(
  errors: { original: string; corrected: string; category: string; explanationPt: string }[],
  count = 8,
): Promise<QuizQuestion[]> {
  const ctx = await loadUserContext();
  const { data } = await callAI('errorQuiz', errorQuizPrompt(ctx, errors, count), errorQuizSchema, { temperature: 0.6 });
  return data.questions.slice(0, count);
}

export async function conversationTurn(input: {
  topic: string;
  history: ConversationMessage[];
}): Promise<ConversationTurnResult> {
  const ctx = await loadUserContext();
  const { data } = await callAI('conversationTurn', conversationTurnPrompt(ctx, input), conversationTurnSchema, {
    temperature: 0.7,
  });
  return data;
}
