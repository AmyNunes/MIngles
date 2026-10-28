import { z } from 'zod';

import { REGISTERS } from '@/features/cards/model';

const register = z.enum(REGISTERS).catch('neutral');

/** Saída de `explainTerm` (seção 10.5) + `exampleTerm` (o termo como aparece no exemplo). */
export const explainTermSchema = z.object({
  lemma: z.string().min(1),
  ipa: z.string().default(''),
  partOfSpeech: z.string().default(''),
  meaningPt: z.string().min(1),
  explanationPt: z.string().default(''),
  exampleEn: z.string().default(''),
  examplePt: z.string().default(''),
  register,
  isMultiword: z.boolean().default(false),
  exampleTerm: z.string().default(''),
});
export type ExplainTermResult = z.infer<typeof explainTermSchema>;

/** Saída de `howDoISay`. */
export const howDoISaySchema = z.object({
  options: z
    .array(z.object({ en: z.string().min(1), register, notePt: z.string().default('') }))
    .min(1),
  bestIndex: z.number().int().min(0).default(0),
});
export type HowDoISayResult = z.infer<typeof howDoISaySchema>;

/** Saída de `explainMore`. */
export const explainMoreResultSchema = z.object({
  explanationPt: z.string().min(1),
  extraExamples: z.array(z.object({ en: z.string(), pt: z.string() })).default([]),
  commonMistakesPt: z.string().default(''),
});
