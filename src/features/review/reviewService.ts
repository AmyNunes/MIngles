import { getCardsWithNotes, getDueCards, getNewCards } from '@/db/cardsRepo';
import { todayReviewStats } from '@/db/reviewLogsRepo';
import { applyReview, undoReview } from '@/db/reviewRepo';
import type { CardRow, CardWithNote } from '@/features/cards/model';
import { endOfStudyDay, studyDayKey } from '@/lib/dates';
import { gradeOf, retrievability, type SchedulingState, type StudyRating } from '@/srs/fsrs';
import { buildQueue, type QueueCandidate, type QueueResult } from '@/srs/queue';
import { useSettings } from '@/stores/settingsStore';

export { SECONDS_PER_CARD } from '@/srs/constants';

export function currentStudyDay(now = new Date()): string {
  return studyDayKey(now, useSettings.getState().study.rolloverHour);
}

/** "Revisar mais": quanto a mais além dos limites do dia. */
const EXTRA_NEW = 10;
const EXTRA_REVIEWS = 50;

/** Calcula a fila do dia (só ids e ordem). Com `extra`, é o "Revisar mais". */
export async function computeTodayQueue(now = new Date(), extra = false): Promise<QueueResult> {
  const base = useSettings.getState().study;
  const study = extra
    ? { ...base, newPerDay: base.newPerDay + EXTRA_NEW, maxReviewsPerDay: base.maxReviewsPerDay + EXTRA_REVIEWS }
    : base;
  const day = studyDayKey(now, study.rolloverHour);
  const end = endOfStudyDay(now, study.rolloverHour).toISOString();
  const [due, fresh, today] = await Promise.all([
    getDueCards(end),
    // pega folga: alguns novos podem ficar de fora por serem irmãos
    getNewCards(study.newPerDay * 3 + 10),
    todayReviewStats(day),
  ]);

  const toCandidate = (c: CardRow): QueueCandidate => ({
    id: c.id,
    noteId: c.noteId,
    type: c.type,
    state: c.state,
    due: c.due,
    retrievability: retrievability(c, now, study.retention),
  });

  return buildQueue({
    dueCards: due.map(toCandidate),
    newCards: fresh.map(toCandidate),
    maxReviewsPerDay: study.maxReviewsPerDay,
    newPerDay: study.newPerDay,
    reviewsDoneToday: today.reviewsDone,
    newDoneToday: today.newDone,
    seenToday: today.seen,
  });
}

/** Fila do dia com as notas carregadas. `limit` = dia mínimo. */
export async function loadTodayQueue(
  limit?: number,
  extra = false,
): Promise<{ cards: CardWithNote[]; returnMode: boolean }> {
  const queue = await computeTodayQueue(new Date(), extra);
  const ids = queue.cards.map((c) => c.id).slice(0, limit ?? queue.cards.length);
  return { cards: await getCardsWithNotes(ids), returnMode: queue.returnMode };
}

export function schedulingOf(card: CardRow): SchedulingState {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsedDays,
    scheduledDays: card.scheduledDays,
    learningSteps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.lastReview,
  };
}

/** Grava a avaliação e devolve o id do registro (para desfazer). */
export async function recordRating(
  card: CardRow,
  rating: StudyRating,
  next: SchedulingState,
  now: Date,
  durationMs: number,
): Promise<string> {
  return applyReview({
    cardId: card.id,
    noteId: card.noteId,
    rating: gradeOf(rating),
    prev: schedulingOf(card),
    next,
    reviewedAt: now.toISOString(),
    studyDay: currentStudyDay(now),
    durationMs,
  });
}

export async function revertRating(logId: string): Promise<SchedulingState | null> {
  return undoReview(logId);
}
