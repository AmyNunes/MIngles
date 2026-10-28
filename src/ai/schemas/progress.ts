import { z } from 'zod';

/** Saída de `weeklySummary`. */
export const weeklySummarySchema = z.object({
  summaryPt: z.string().min(1),
  focusNextWeekPt: z.string().default(''),
});

/** Saída de `avoidanceReport`. */
export const avoidanceReportSchema = z.object({
  overused: z
    .array(z.object({ word: z.string(), count: z.number().default(0), alternatives: z.array(z.string()).default([]) }))
    .default([]),
  avoidedStructures: z
    .array(z.object({ structure: z.string(), explanationPt: z.string().default(''), example: z.string().default('') }))
    .default([]),
});
export type AvoidanceReport = z.infer<typeof avoidanceReportSchema>;
