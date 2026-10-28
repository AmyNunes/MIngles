import type { CardWithNote } from '@/features/cards/model';
import { newSchedulingState } from '@/srs/fsrs';

import { EMPTY_WIDGET_STATE, pickWidgetCard, widgetViewOf } from '../widgetModel';

describe('pickWidgetCard', () => {
  it('fica no mesmo card enquanto ele estiver na fila', () => {
    const state = { cardId: 'b', flipped: true, lastRatedId: null };
    expect(pickWidgetCard(['a', 'b'], state)).toBe(state);
  });

  it('pega o primeiro da fila, pulando o que acabei de avaliar', () => {
    expect(pickWidgetCard(['x', 'y'], { cardId: null, flipped: false, lastRatedId: 'x' })).toEqual({
      cardId: 'y',
      flipped: false,
      lastRatedId: 'x',
    });
  });

  it('se só sobrou o recém-avaliado, mostra ele mesmo', () => {
    expect(pickWidgetCard(['x'], { ...EMPTY_WIDGET_STATE, lastRatedId: 'x' }).cardId).toBe('x');
  });

  it('fila vazia: nenhum card', () => {
    expect(pickWidgetCard([], { cardId: 'gone', flipped: true, lastRatedId: null })).toEqual({
      cardId: null,
      flipped: false,
      lastRatedId: null,
    });
  });
});

describe('widgetViewOf', () => {
  it('sem card, mostra o estado vazio', () => {
    expect(widgetViewOf(null, false, 0)).toEqual({ kind: 'empty' });
  });

  it('monta frente e verso de um card de Produção', () => {
    const card: CardWithNote = {
      ...newSchedulingState(new Date(2026, 9, 20)),
      id: 'c1',
      noteId: 'n1',
      type: 'production',
      suspended: false,
      createdAt: '2026-10-20T00:00:00.000Z',
      note: {
        id: 'n1',
        kind: 'production',
        term: 'estou atrasado',
        lemma: "i'm running late",
        data: { pt: 'estou atrasado', en: "I'm running late", register: 'neutral', notePt: '', alternatives: [] },
        sourceId: null,
        sourceLabel: null,
        extra: null,
        createdAt: '2026-10-20T00:00:00.000Z',
        updatedAt: '2026-10-20T00:00:00.000Z',
      },
    };
    const view = widgetViewOf(card, true, 3);
    expect(view).toMatchObject({ kind: 'card', cardId: 'c1', typeColor: 'typeProduction', flipped: true, remaining: 3 });
    if (view.kind !== 'card') throw new Error('esperava um card');
    expect(view.front).toContain('estou atrasado');
    expect(view.back).toContain("I'm running late");
  });
});
