import { z } from 'zod';

import { ERROR_CATEGORY_CODES, SEVERITIES } from '@/features/errors/taxonomy';

/*
 * Nota = o conteúdo salvo (termo, frase, erro).
 * Card = um jeito de praticar a nota, com agenda FSRS própria.
 */

export const NOTE_KINDS = ['term', 'production', 'error'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export const CARD_TYPES = ['context', 'production', 'cloze', 'error'] as const;
export type CardType = (typeof CARD_TYPES)[number];

export const REGISTERS = ['neutral', 'informal', 'formal'] as const;
export const registerSchema = z.enum(REGISTERS).catch('neutral');
export type Register = (typeof REGISTERS)[number];

/** Termo/expressão em inglês (cards de Contexto, Lacuna e, opcionalmente, Produção). */
export const termDataSchema = z.object({
  /** Frase em inglês onde o termo aparece. */
  sentence: z.string(),
  /** O termo exatamente como aparece na frase (pode estar flexionado). */
  termInSentence: z.string().catch(''),
  meaningPt: z.string().catch(''),
  explanationPt: z.string().catch(''),
  ipa: z.string().catch(''),
  partOfSpeech: z.string().catch(''),
  exampleEn: z.string().catch(''),
  examplePt: z.string().catch(''),
  register: registerSchema,
  isMultiword: z.boolean().catch(false),
  /** Outras frases juntadas a esta nota ("Juntar à existente"). */
  contexts: z.array(z.string()).catch([]),
});
export type TermData = z.infer<typeof termDataSchema>;

/** "Como eu digo?": intenção em PT → forma natural em inglês. */
export const productionDataSchema = z.object({
  pt: z.string(),
  en: z.string(),
  register: registerSchema,
  notePt: z.string().catch(''),
  alternatives: z
    .array(z.object({ en: z.string(), register: registerSchema, notePt: z.string().catch('') }))
    .catch([]),
});
export type ProductionData = z.infer<typeof productionDataSchema>;

/** Erro meu, vindo do Diário, Desafio ou Conversa. */
export const errorDataSchema = z.object({
  original: z.string(),
  corrected: z.string(),
  category: z.enum(ERROR_CATEGORY_CODES).catch('word_choice'),
  severity: z.enum(SEVERITIES).catch('error'),
  explanationPt: z.string().catch(''),
  exampleEn: z.string().catch(''),
  errorId: z.string().nullable().catch(null),
});
export type ErrorData = z.infer<typeof errorDataSchema>;

/** Resultado de "Explicar mais (IA)", guardado na nota para as próximas vezes. */
export const explainMoreSchema = z.object({
  explanationPt: z.string(),
  extraExamples: z.array(z.object({ en: z.string(), pt: z.string() })),
  commonMistakesPt: z.string(),
});
export type ExplainMore = z.infer<typeof explainMoreSchema>;

type NoteBase = {
  id: string;
  term: string;
  lemma: string;
  sourceId: string | null;
  sourceLabel: string | null;
  extra: ExplainMore | null;
  createdAt: string;
  updatedAt: string;
};

export type TermNote = NoteBase & { kind: 'term'; data: TermData };
export type ProductionNote = NoteBase & { kind: 'production'; data: ProductionData };
export type ErrorNote = NoteBase & { kind: 'error'; data: ErrorData };
export type Note = TermNote | ProductionNote | ErrorNote;

type ContentOf<N> = N extends Note ? Pick<N, 'kind' | 'term' | 'lemma' | 'data'> : never;
/** Só o conteúdo de uma nota (sem id e datas): serve para notas ainda não salvas. */
export type NoteContent = ContentOf<Note>;

/** Estados do FSRS (ts-fsrs `State`) + suspenso. */
export const CARD_STATES = ['new', 'learning', 'review', 'relearning'] as const;
export type CardStateName = (typeof CARD_STATES)[number];

export type CardRow = {
  id: string;
  noteId: string;
  type: CardType;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  /** 0 Novo · 1 Aprendendo · 2 Revisão · 3 Reaprendendo */
  state: number;
  lastReview: string | null;
  suspended: boolean;
  createdAt: string;
};

export type CardWithNote = CardRow & { note: Note };
