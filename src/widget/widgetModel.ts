import { TYPE_COLORS } from '@/components/cards/TypeChip';
import { buildCardContent, segmentsToText } from '@/features/cards/content';
import type { CardWithNote } from '@/features/cards/model';
import { strings } from '@/i18n/strings';
import type { ColorTokens } from '@/theme';

/** O que o widget está mostrando (salvo no banco, porque o widget roda fora do app). */
export type WidgetState = {
  cardId: string | null;
  flipped: boolean;
  /** Último card avaliado no widget: não volta logo em seguida. */
  lastRatedId: string | null;
};

export const EMPTY_WIDGET_STATE: WidgetState = { cardId: null, flipped: false, lastRatedId: null };

export type WidgetView =
  | { kind: 'empty' }
  | {
      kind: 'card';
      cardId: string;
      typeLabel: string;
      typeColor: keyof ColorTokens;
      prompt: string | null;
      front: string;
      back: string;
      detail: string | null;
      flipped: boolean;
      remaining: number;
    };

/** Continua no mesmo card se ele ainda estiver na fila; senão pega o primeiro (evitando o recém-avaliado). */
export function pickWidgetCard(queueIds: string[], state: WidgetState): WidgetState {
  if (state.cardId && queueIds.includes(state.cardId)) return state;
  const next = queueIds.find((id) => id !== state.lastRatedId) ?? queueIds[0] ?? null;
  return { cardId: next, flipped: false, lastRatedId: state.lastRatedId };
}

const MAX_CHARS = 160;
const clip = (s: string) => (s.length > MAX_CHARS ? `${s.slice(0, MAX_CHARS - 1)}…` : s);

export function widgetViewOf(card: CardWithNote | null, flipped: boolean, remaining: number): WidgetView {
  if (!card) return { kind: 'empty' };
  const content = buildCardContent(card.note, card.type);
  return {
    kind: 'card',
    cardId: card.id,
    typeLabel: strings.cards.types[card.type],
    typeColor: TYPE_COLORS[card.type],
    prompt: content.front.prompt ?? null,
    front: clip(segmentsToText(content.front.main)),
    back: clip(segmentsToText(content.back.main)),
    detail: content.back.details[0] ? clip(content.back.details[0].text) : null,
    flipped,
    remaining,
  };
}
