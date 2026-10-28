import { z } from 'zod';

export const LEVELS = ['A2', 'B1', 'B2', 'C1', 'C2'] as const;

export const profileSchema = z.object({
  /** `unknown` = "Não sei, estimar pelos meus textos". `null` = ainda não respondi. */
  level: z.enum([...LEVELS, 'unknown']).nullable(),
  goal: z.string(),
  interests: z.array(z.string()),
  occupation: z.string(),
  variant: z.enum(['us', 'uk']),
  knownDifficulties: z.string(),
});

export type Profile = z.infer<typeof profileSchema>;
export type Level = NonNullable<Profile['level']>;
export type EnglishVariant = Profile['variant'];

export const emptyProfile: Profile = {
  level: null,
  goal: '',
  interests: [],
  occupation: '',
  variant: 'us',
  knownDifficulties: '',
};
