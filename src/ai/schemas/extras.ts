import { z } from 'zod';

/** Roteiro do podcast (o que fica guardado além do título). */
export const podcastScriptSchema = z.object({
  paragraphs: z.array(z.string().min(1)).min(1),
  glossary: z.array(z.object({ en: z.string().min(1), pt: z.string().default('') })).default([]),
});

/** Podcast do dia (Fase 8): episódio curto lido pelo `expo-speech`. */
export const podcastSchema = podcastScriptSchema.extend({ title: z.string().min(1) });
export type Podcast = z.infer<typeof podcastSchema>;

/** Foto de página → texto (Fase 8). `text` vazio = não achei texto em inglês. */
export const photoTextSchema = z.object({
  title: z.string().default(''),
  text: z.string().default(''),
});
export type PhotoText = z.infer<typeof photoTextSchema>;
