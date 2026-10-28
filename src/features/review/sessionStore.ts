import { create } from 'zustand';

import { markMinimalDay, markStepDone } from '@/db/activityRepo';
import type { CardWithNote } from '@/features/cards/model';
import { haptics } from '@/lib/haptics';
import { previewRatings, type RatingPreview, type StudyRating } from '@/srs/fsrs';
import { useSettings } from '@/stores/settingsStore';

import { emitAppEvent } from '@/features/app/events';

import { currentStudyDay, loadTodayQueue, recordRating, revertRating } from './reviewService';

/** "Errei" volta na mesma sessão se o próximo passo vencer dentro deste tempo. */
const LEARN_AHEAD_MS = 20 * 60_000;
const MAX_DURATION_MS = 60_000;

type HistoryEntry = {
  logId: string;
  position: number;
  rating: StudyRating;
  requeued: boolean;
  /** O card como estava antes da avaliação. */
  before: CardWithNote;
};

type Status = 'idle' | 'loading' | 'active' | 'done' | 'empty' | 'error';

type ReviewSessionState = {
  status: Status;
  minimal: boolean;
  returnMode: boolean;
  queue: CardWithNote[];
  position: number;
  flipped: boolean;
  preview: RatingPreview | null;
  shownAt: number;
  startedAt: number;
  history: HistoryEntry[];
  busy: boolean;

  start: (options: { minimal: boolean; more?: boolean }) => Promise<void>;
  flip: () => void;
  rate: (rating: StudyRating) => Promise<void>;
  undo: () => Promise<boolean>;
  /** Tira o card atual da sessão (suspenso ou excluído). */
  dropCurrent: () => void;
  /** Recoloca um card na posição atual (desfazer suspender/excluir). */
  insertAtCurrent: (card: CardWithNote) => void;
  /** Atualiza o card atual depois de editar a nota. */
  replaceCard: (card: CardWithNote) => void;
  reset: () => void;
};

const initial = {
  status: 'idle' as Status,
  minimal: false,
  returnMode: false,
  queue: [],
  position: 0,
  flipped: false,
  preview: null,
  shownAt: 0,
  startedAt: 0,
  history: [],
  busy: false,
};

export const useReviewSession = create<ReviewSessionState>()((set, get) => {
  const finish = async () => {
    const { minimal } = get();
    set({ status: 'done', flipped: false, preview: null });
    haptics.success();
    const day = currentStudyDay();
    if (minimal) await markMinimalDay(day);
    else await markStepDone(day, 'review');
    emitAppEvent('reviewSessionFinished');
  };

  return {
    ...initial,

    start: async ({ minimal, more }) => {
      set({ ...initial, status: 'loading', minimal });
      try {
        const size = minimal ? useSettings.getState().study.minimalDaySize : undefined;
        const { cards, returnMode } = await loadTodayQueue(size, more);
        const now = Date.now();
        set({
          status: cards.length ? 'active' : 'empty',
          queue: cards,
          returnMode,
          shownAt: now,
          startedAt: now,
        });
      } catch {
        set({ status: 'error' });
      }
    },

    flip: () => {
      const { queue, position, flipped } = get();
      const card = queue[position];
      if (!card || flipped) return;
      const retention = useSettings.getState().study.retention;
      set({ flipped: true, preview: previewRatings(card, new Date(), retention) });
      haptics.light();
    },

    rate: async (rating) => {
      const { queue, position, flipped, busy, shownAt, history } = get();
      const card = queue[position];
      if (!card || !flipped || busy) return;
      set({ busy: true });
      try {
        const now = new Date();
        const retention = useSettings.getState().study.retention;
        const preview = get().preview ?? previewRatings(card, now, retention);
        const next = preview[rating].next;
        const logId = await recordRating(card, rating, next, now, Math.min(MAX_DURATION_MS, now.getTime() - shownAt));
        haptics.medium();

        const updated: CardWithNote = { ...card, ...next };
        const nextQueue = [...queue];
        const requeued = new Date(next.due).getTime() - now.getTime() <= LEARN_AHEAD_MS;
        if (requeued) nextQueue.push(updated);
        nextQueue[position] = updated;

        set({
          queue: nextQueue,
          position: position + 1,
          flipped: false,
          preview: null,
          shownAt: Date.now(),
          history: [...history, { logId, position, rating, requeued, before: card }],
        });
        if (position + 1 >= nextQueue.length) await finish();
      } finally {
        set({ busy: false });
      }
    },

    undo: async () => {
      const { history, queue, busy } = get();
      const last = history.at(-1);
      if (!last || busy) return false;
      set({ busy: true });
      try {
        await revertRating(last.logId);
        const nextQueue = [...queue];
        if (last.requeued) {
          const index = nextQueue.map((c) => c.id).lastIndexOf(last.before.id);
          if (index > last.position) nextQueue.splice(index, 1);
        }
        nextQueue[last.position] = last.before;
        set({
          status: 'active',
          queue: nextQueue,
          position: last.position,
          flipped: false,
          preview: null,
          shownAt: Date.now(),
          history: history.slice(0, -1),
        });
        return true;
      } finally {
        set({ busy: false });
      }
    },

    dropCurrent: () => {
      const { queue, position } = get();
      const id = queue[position]?.id;
      if (!id) return;
      const nextQueue = queue.filter((c, i) => i < position || c.id !== id);
      set({ queue: nextQueue, flipped: false, preview: null, shownAt: Date.now() });
      if (position >= nextQueue.length) void finish();
    },

    insertAtCurrent: (card) => {
      const { queue, position } = get();
      const nextQueue = [...queue];
      nextQueue.splice(position, 0, card);
      set({ queue: nextQueue, status: 'active', flipped: false, preview: null, shownAt: Date.now() });
    },

    replaceCard: (card) => {
      set((s) => ({ queue: s.queue.map((c) => (c.id === card.id ? { ...c, note: card.note } : c)) }));
    },

    reset: () => set(initial),
  };
});

/** Estatísticas do fim da sessão. */
export function sessionSummary(state: Pick<ReviewSessionState, 'history' | 'startedAt'>) {
  const firstRatings = new Map<string, StudyRating>();
  for (const h of state.history) {
    if (!firstRatings.has(h.before.id)) firstRatings.set(h.before.id, h.rating);
  }
  const reviewed = firstRatings.size;
  const correct = [...firstRatings.values()].filter((r) => r === 'good' || r === 'easy').length;
  const hardest: CardWithNote[] = [];
  for (const h of state.history) {
    if (h.rating === 'again' && !hardest.some((c) => c.id === h.before.id)) hardest.push(h.before);
  }
  return {
    reviewed,
    accuracy: reviewed ? correct / reviewed : 0,
    durationMs: Date.now() - state.startedAt,
    hardest: hardest.slice(0, 3),
  };
}
