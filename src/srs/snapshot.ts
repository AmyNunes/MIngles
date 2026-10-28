import { z } from 'zod';

/** Estado de agenda de um card guardado em `review_logs.prevCard` (para desfazer). */
export const schedulingStateSchema = z.object({
  due: z.string(),
  stability: z.number(),
  difficulty: z.number(),
  elapsedDays: z.number(),
  scheduledDays: z.number(),
  learningSteps: z.number(),
  reps: z.number(),
  lapses: z.number(),
  state: z.number(),
  lastReview: z.string().nullable(),
});

export type SchedulingStateSnapshot = z.infer<typeof schedulingStateSchema>;
