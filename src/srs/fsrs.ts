import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  type Card as FsrsCard,
  type FSRS,
  type Grade,
  type State,
} from 'ts-fsrs';

import type { CardRow } from '@/features/cards/model';
import { strings } from '@/i18n/strings';

/** Avaliações na interface: Errei, Difícil, Bom, Fácil. */
export const RATINGS = ['again', 'hard', 'good', 'easy'] as const;
export type StudyRating = (typeof RATINGS)[number];

const TO_GRADE: Record<StudyRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

export const ratingFromGrade = (grade: number): StudyRating =>
  RATINGS[Math.min(3, Math.max(0, grade - 1))];

export const gradeOf = (rating: StudyRating): number => TO_GRADE[rating];

/** Os campos de agenda de um card (o que muda a cada revisão). */
export type SchedulingState = Pick<
  CardRow,
  | 'due'
  | 'stability'
  | 'difficulty'
  | 'elapsedDays'
  | 'scheduledDays'
  | 'learningSteps'
  | 'reps'
  | 'lapses'
  | 'state'
  | 'lastReview'
>;

const schedulers = new Map<number, FSRS>();

/** Agendador FSRS com a retenção desejada (0,80–0,97) e fuzz ligado. */
export function scheduler(retention: number): FSRS {
  const key = Math.round(retention * 100) / 100;
  let f = schedulers.get(key);
  if (!f) {
    f = fsrs(generatorParameters({ request_retention: key, enable_fuzz: true, enable_short_term: true }));
    schedulers.set(key, f);
  }
  return f;
}

export function toFsrsCard(s: SchedulingState): FsrsCard {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsedDays,
    scheduled_days: s.scheduledDays,
    learning_steps: s.learningSteps,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state as State,
    last_review: s.lastReview ? new Date(s.lastReview) : undefined,
  };
}

export function fromFsrsCard(c: FsrsCard): SchedulingState {
  return {
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    lastReview: c.last_review ? c.last_review.toISOString() : null,
  };
}

/** Agenda de um card recém-criado (Novo, vence agora). */
export function newSchedulingState(now: Date): SchedulingState {
  return fromFsrsCard(createEmptyCard(now));
}

export type RatingPreview = Record<StudyRating, { next: SchedulingState; interval: string }>;

/** Prévia das 4 avaliações (usada nos rótulos da barra e no arraste). */
export function previewRatings(s: SchedulingState, now: Date, retention: number): RatingPreview {
  const record = scheduler(retention).repeat(toFsrsCard(s), now);
  const entries = RATINGS.map((r) => {
    const next = record[TO_GRADE[r]].card;
    return [r, { next: fromFsrsCard(next), interval: formatInterval(now, next.due) }] as const;
  });
  return Object.fromEntries(entries) as RatingPreview;
}

export function rateCard(
  s: SchedulingState,
  rating: StudyRating,
  now: Date,
  retention: number,
): SchedulingState {
  return fromFsrsCard(scheduler(retention).next(toFsrsCard(s), now, TO_GRADE[rating]).card);
}

/** Chance estimada de lembrar agora (0–1). Card novo conta como 0. */
export function retrievability(s: SchedulingState, now: Date, retention: number): number {
  if (s.state === 0) return 0;
  return scheduler(retention).get_retrievability(toFsrsCard(s), now, false);
}

const i = strings.review.interval;

/** "<1 min", "10 min", "3 h", "8 d", "2 meses", "1,5 ano". */
export function formatInterval(from: Date, to: Date): string {
  const minutes = (to.getTime() - from.getTime()) / 60_000;
  if (minutes < 1) return i.lessThanMinute;
  if (minutes < 60) return i.minutes(Math.round(minutes));
  const hours = minutes / 60;
  if (hours < 24) return i.hours(Math.round(hours));
  const days = hours / 24;
  if (days < 31) return i.days(Math.round(days));
  if (days < 365) return i.months(Math.round(days / 30));
  return i.years((days / 365).toFixed(1).replace('.', ',').replace(',0', ''));
}
