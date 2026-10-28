import { z } from 'zod';

import { ERROR_CATEGORY_CODES, SEVERITIES } from '@/features/errors/taxonomy';

/** Uma alteração da correção (com categoria da taxonomia 10.6 e gravidade). */
export const editSchema = z.object({
  original: z.string(),
  corrected: z.string(),
  category: z.enum(ERROR_CATEGORY_CODES).catch('word_choice'),
  severity: z.enum(SEVERITIES).catch('error'),
  explanationPt: z.string().default(''),
  /** Um exemplo correto extra (para o card de Erro). */
  exampleEn: z.string().default(''),
});
export type Edit = z.infer<typeof editSchema>;

/** Saída de `correctText`. */
export const correctTextSchema = z.object({
  correctedText: z.string(),
  naturalVersion: z.string().default(''),
  edits: z.array(editSchema).default([]),
  usedRequiredItems: z.array(z.string()).default([]),
});
export type CorrectTextResult = z.infer<typeof correctTextSchema>;

export const REQUIRED_ITEM_KINDS = ['term', 'structure', 'category'] as const;
export const requiredItemSchema = z.object({
  text: z.string().min(1),
  kind: z.enum(REQUIRED_ITEM_KINDS).catch('term'),
});
export type RequiredItem = z.infer<typeof requiredItemSchema>;

/** Saída de `dailyChallenge`. */
export const dailyChallengeSchema = z.object({
  promptPt: z.string().min(1),
  requiredItems: z.array(requiredItemSchema).default([]),
  exampleAnswer: z.string().default(''),
});
export type DailyChallengeResult = z.infer<typeof dailyChallengeSchema>;

export const QUESTION_TYPES = ['multiple_choice', 'find_error', 'complete'] as const;
export const questionSchema = z.object({
  type: z.enum(QUESTION_TYPES).catch('multiple_choice'),
  promptEn: z.string().min(1),
  options: z.array(z.string()).optional(),
  answer: z.string().min(1),
  explanationPt: z.string().default(''),
  category: z.enum(ERROR_CATEGORY_CODES).catch('word_choice'),
});
export type QuizQuestion = z.infer<typeof questionSchema>;

/** Saída de `errorQuiz`. */
export const errorQuizSchema = z.object({ questions: z.array(questionSchema).min(1) });

/** Saída de `conversationTurn`. */
export const conversationTurnSchema = z.object({
  replyEn: z.string().min(1),
  corrections: z.array(editSchema).default([]),
});
export type ConversationTurnResult = z.infer<typeof conversationTurnSchema>;
