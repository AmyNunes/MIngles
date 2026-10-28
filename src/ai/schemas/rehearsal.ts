import { z } from 'zod';

/** Saída de `rehearsalPrep` (seção 10.5). */
export const rehearsalPrepSchema = z.object({
  vocab: z.array(z.object({ en: z.string().min(1), pt: z.string().default(''), note: z.string().default('') })).default([]),
  keyPhrases: z.array(z.string()).default([]),
  roleplayOpening: z.string().min(1),
});
export type RehearsalPrep = z.infer<typeof rehearsalPrepSchema>;
