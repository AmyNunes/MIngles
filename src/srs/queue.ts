import type { CardType } from '@/features/cards/model';

/** O mínimo de cada card que a fila precisa saber. */
export type QueueCandidate = {
  id: string;
  noteId: string;
  type: CardType;
  /** 0 = novo */
  state: number;
  due: string;
  /** Chance de lembrar agora (0–1); a fila começa pelos menores. */
  retrievability: number;
};

export type QueueInput = {
  /** Cards não novos que vencem até o fim do dia de estudo. */
  dueCards: QueueCandidate[];
  /** Cards novos, na ordem em que foram criados. */
  newCards: QueueCandidate[];
  maxReviewsPerDay: number;
  newPerDay: number;
  reviewsDoneToday: number;
  newDoneToday: number;
  /** Notas que já tiveram algum card revisado hoje → cards que já apareceram. */
  seenToday: Map<string, Set<string>>;
};

export type QueueResult = {
  cards: QueueCandidate[];
  /** Ativado quando os vencidos passam de 2× o máximo diário (seção 12). */
  returnMode: boolean;
  dueTotal: number;
};

export const RETURN_MODE_LIMIT = 60;
const NEW_EVERY = 4;
const TYPE_LOOKAHEAD = 3;

/**
 * Fila do dia (seção 12):
 * 1. vencidos, do menor para o maior nível de lembrança, até o máximo de revisões;
 * 2. novos até o limite diário, intercalados (1 novo a cada 4 revisões);
 * 3. evita dois cards do mesmo tipo seguidos quando possível;
 * 4. cards irmãos (mesma nota) nunca no mesmo dia.
 * Modo retorno: limite de 60 e nenhum card novo, até a fila normalizar.
 */
export function buildQueue(input: QueueInput): QueueResult {
  const dueTotal = input.dueCards.length;
  const returnMode = dueTotal > 2 * input.maxReviewsPerDay;

  const reviewCap = returnMode
    ? Math.min(RETURN_MODE_LIMIT, input.maxReviewsPerDay)
    : input.maxReviewsPerDay;
  const reviewLimit = Math.max(0, reviewCap - input.reviewsDoneToday);
  const newLimit = returnMode ? 0 : Math.max(0, input.newPerDay - input.newDoneToday);

  // Irmãos ficam para outro dia: se outro card da mesma nota já foi revisado hoje
  // ou já está na fila, este espera.
  const takenByNote = new Map<string, string>();
  const takeIfNoSibling = (card: QueueCandidate): boolean => {
    const seen = input.seenToday.get(card.noteId);
    if (seen && !seen.has(card.id)) return false;
    const taken = takenByNote.get(card.noteId);
    if (taken && taken !== card.id) return false;
    takenByNote.set(card.noteId, card.id);
    return true;
  };

  const reviews: QueueCandidate[] = [];
  const sortedDue = [...input.dueCards].sort(
    (a, b) => a.retrievability - b.retrievability || a.due.localeCompare(b.due),
  );
  for (const card of sortedDue) {
    if (reviews.length >= reviewLimit) break;
    if (takeIfNoSibling(card)) reviews.push(card);
  }

  const news: QueueCandidate[] = [];
  for (const card of input.newCards) {
    if (news.length >= newLimit) break;
    if (takeIfNoSibling(card)) news.push(card);
  }

  return { cards: avoidSameTypeInARow(interleave(reviews, news)), returnMode, dueTotal };
}

/** 4 revisões, 1 novo, 4 revisões, 1 novo… (o que sobrar vai no fim). */
export function interleave<T>(reviews: T[], news: T[]): T[] {
  const out: T[] = [];
  let r = 0;
  let n = 0;
  while (r < reviews.length || n < news.length) {
    for (let k = 0; k < NEW_EVERY && r < reviews.length; k++) out.push(reviews[r++]);
    if (n < news.length) out.push(news[n++]);
  }
  return out;
}

/** Se dois seguidos têm o mesmo tipo, traz para a frente o próximo de tipo diferente (perto). */
export function avoidSameTypeInARow<T extends { type: string }>(cards: T[]): T[] {
  const out = [...cards];
  for (let i = 1; i < out.length; i++) {
    if (out[i].type !== out[i - 1].type) continue;
    const limit = Math.min(out.length, i + 1 + TYPE_LOOKAHEAD);
    for (let j = i + 1; j < limit; j++) {
      if (out[j].type !== out[i - 1].type) {
        const [picked] = out.splice(j, 1);
        out.splice(i, 0, picked);
        break;
      }
    }
  }
  return out;
}
