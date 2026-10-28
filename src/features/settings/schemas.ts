import { z } from 'zod';

import { PROVIDER_IDS, PROVIDERS } from '@/ai/providers';
import { notificationSettingsSchema } from '@/notifications/types';

/*
 * Cada grupo de configurações é salvo numa chave da tabela `settings`.
 * Todo campo tem `.catch(padrão)`: se faltar ou vier inválido, usa o padrão
 * sem perder os outros campos.
 */

const appearanceDefaults = {
  themePreference: 'system' as const,
  cardTextSize: 'md' as const,
  readerFontSize: 19,
};

export const appearanceSchema = z
  .object({
    themePreference: z.enum(['system', 'light', 'dark']).catch('system'),
    /** Tamanho do texto principal do flashcard. */
    cardTextSize: z.enum(['sm', 'md', 'lg']).catch('md'),
    /** Tamanho da fonte do Leitor (16–26). */
    readerFontSize: z.number().min(16).max(26).catch(19),
  })
  .catch(appearanceDefaults);

const studyDefaults = {
  newPerDay: 20,
  maxReviewsPerDay: 200,
  retention: 0.9,
  minimalDaySize: 5,
  rolloverHour: 4,
  autoCloze: true,
  productionFromContext: false,
};

export const studySchema = z
  .object({
    newPerDay: z.number().int().min(0).max(100).catch(studyDefaults.newPerDay),
    maxReviewsPerDay: z.number().int().min(10).max(1000).catch(studyDefaults.maxReviewsPerDay),
    /** Retenção desejada do FSRS (0,80–0,97). */
    retention: z.number().min(0.8).max(0.97).catch(studyDefaults.retention),
    minimalDaySize: z.number().int().min(1).max(20).catch(studyDefaults.minimalDaySize),
    /** Hora em que o dia de estudo vira (0–6). */
    rolloverHour: z.number().int().min(0).max(6).catch(studyDefaults.rolloverHour),
    autoCloze: z.boolean().catch(studyDefaults.autoCloze),
    productionFromContext: z.boolean().catch(studyDefaults.productionFromContext),
  })
  .catch(studyDefaults);

const gesturesDefaults = {
  enabled: true,
  sensitivity: 'medium' as const,
  leftHanded: false,
  haptics: true,
  coachMarksSeen: [],
};

export const gesturesSchema = z
  .object({
    /** Gestos na revisão. */
    enabled: z.boolean().catch(true),
    /** baixa/média/alta → limite de 45%/35%/25% da tela. */
    sensitivity: z.enum(['low', 'medium', 'high']).catch('medium'),
    leftHanded: z.boolean().catch(false),
    haptics: z.boolean().catch(true),
    /** Telas cujo guia de gestos já foi visto. */
    coachMarksSeen: z.array(z.string()).catch([]),
  })
  .catch(gesturesDefaults);

export const voiceSchema = z
  .object({
    rate: z.number().min(0.5).max(1.25).catch(1),
    accent: z.enum(['en-US', 'en-GB']).catch('en-US'),
  })
  .catch({ rate: 1, accent: 'en-US' as const });

export const reviewPrefsSchema = z
  .object({
    autoListen: z.boolean().catch(false),
    typeAnswer: z.boolean().catch(false),
  })
  .catch({ autoListen: false, typeAnswer: false });

export const CAPTURE_MODES = ['howDoISay', 'term', 'sentence', 'think'] as const;
export type CaptureMode = (typeof CAPTURE_MODES)[number];

export const captureSchema = z
  .object({
    lastMode: z.enum(['howDoISay', 'term', 'sentence']).catch('howDoISay'),
  })
  .catch({ lastMode: 'howDoISay' as const });

const aiDefaults = {
  provider: 'gemini' as const,
  baseUrl: PROVIDERS.gemini.baseUrl,
  model: '',
  inputPricePerMillion: null,
  outputPricePerMillion: null,
  monthlyLimit: null,
  jsonModeUnsupported: [],
};

export const aiSettingsSchema = z
  .object({
    provider: z.enum(PROVIDER_IDS).catch(aiDefaults.provider),
    baseUrl: z.string().catch(aiDefaults.baseUrl),
    model: z.string().catch(aiDefaults.model),
    /** US$ por milhão de tokens (opcional, só para estimar o gasto). */
    inputPricePerMillion: z.number().nonnegative().nullable().catch(null),
    outputPricePerMillion: z.number().nonnegative().nullable().catch(null),
    /** Limite mensal em US$. Ao chegar a 100%, as funções de IA pausam. */
    monthlyLimit: z.number().positive().nullable().catch(null),
    /** "url|modelo" que recusaram `response_format: json_object`. */
    jsonModeUnsupported: z.array(z.string()).catch([]),
  })
  .catch(aiDefaults);

export const settingsGroups = {
  appearance: appearanceSchema,
  ai: aiSettingsSchema,
  study: studySchema,
  gestures: gesturesSchema,
  voice: voiceSchema,
  review: reviewPrefsSchema,
  capture: captureSchema,
  notifications: notificationSettingsSchema,
};

export type SettingsGroups = typeof settingsGroups;
export type SettingsGroup = keyof SettingsGroups;
export type Settings = { [K in SettingsGroup]: z.output<SettingsGroups[K]> };
export type AppearanceSettings = Settings['appearance'];
export type AISettings = Settings['ai'];
export type StudySettings = Settings['study'];
export type GestureSettings = Settings['gestures'];

/** Limite do arraste (fração da tela) por sensibilidade (seção 8.7). */
export const SWIPE_THRESHOLDS = { low: 0.45, medium: 0.35, high: 0.25 } as const;
