import { avoidSameTypeInARow, buildQueue, interleave, type QueueCandidate, type QueueInput } from '../queue';

let seq = 0;
function card(partial: Partial<QueueCandidate> = {}): QueueCandidate {
  seq++;
  return {
    id: `c${seq}`,
    noteId: `n${seq}`,
    type: 'context',
    state: 2,
    due: `2026-10-20T08:${String(seq % 60).padStart(2, '0')}:00.000Z`,
    retrievability: 0.5,
    ...partial,
  };
}

function input(partial: Partial<QueueInput> = {}): QueueInput {
  return {
    dueCards: [],
    newCards: [],
    maxReviewsPerDay: 200,
    newPerDay: 20,
    reviewsDoneToday: 0,
    newDoneToday: 0,
    seenToday: new Map(),
    ...partial,
  };
}

describe('buildQueue', () => {
  it('vencidos do menor para o maior nível de lembrança', () => {
    const a = card({ retrievability: 0.9 });
    const b = card({ retrievability: 0.2 });
    const c = card({ retrievability: 0.6, type: 'cloze' });
    const { cards } = buildQueue(input({ dueCards: [a, b, c] }));
    expect(cards.map((x) => x.id)).toEqual([b.id, c.id, a.id]);
  });

  it('respeita o máximo de revisões, descontando as já feitas hoje', () => {
    const due = Array.from({ length: 10 }, () => card());
    const { cards } = buildQueue(input({ dueCards: due, maxReviewsPerDay: 5, reviewsDoneToday: 2 }));
    expect(cards).toHaveLength(3);
  });

  it('novos até o limite do dia, intercalados 1 a cada 4 revisões', () => {
    const due = Array.from({ length: 8 }, () => card({ type: 'context' }));
    const news = Array.from({ length: 5 }, () => card({ state: 0, type: 'context' }));
    const { cards } = buildQueue(input({ dueCards: due, newCards: news, newPerDay: 3, newDoneToday: 1 }));
    const pattern = cards.map((x) => (x.state === 0 ? 'N' : 'R')).join('');
    expect(pattern).toBe('RRRRNRRRRN');
  });

  it('irmãos (mesma nota) nunca no mesmo dia', () => {
    const ctx = card({ noteId: 'same', type: 'context' });
    const cloze = card({ noteId: 'same', type: 'cloze' });
    const { cards } = buildQueue(input({ dueCards: [ctx, cloze] }));
    expect(cards).toHaveLength(1);
  });

  it('se um irmão já foi revisado hoje, o outro espera; o próprio card pode voltar', () => {
    const reviewed = card({ noteId: 'n-x', type: 'context' });
    const sibling = card({ noteId: 'n-x', type: 'cloze' });
    const seenToday = new Map([['n-x', new Set([reviewed.id])]]);
    const { cards } = buildQueue(input({ dueCards: [sibling, reviewed], seenToday }));
    expect(cards.map((x) => x.id)).toEqual([reviewed.id]);
  });

  it('modo retorno: vencidos > 2× o máximo → limite 60 e nenhum novo', () => {
    const due = Array.from({ length: 101 }, () => card());
    const news = [card({ state: 0 })];
    const result = buildQueue(input({ dueCards: due, newCards: news, maxReviewsPerDay: 50 }));
    expect(result.returnMode).toBe(true);
    expect(result.cards).toHaveLength(50);
    expect(result.cards.some((x) => x.state === 0)).toBe(false);

    const big = buildQueue(input({ dueCards: Array.from({ length: 500 }, () => card()), maxReviewsPerDay: 200 }));
    expect(big.cards).toHaveLength(60);
  });
});

describe('ordem', () => {
  it('interleave coloca o que sobrou no fim', () => {
    expect(interleave(['r1', 'r2'], ['n1', 'n2'])).toEqual(['r1', 'r2', 'n1', 'n2']);
  });

  it('evita dois do mesmo tipo seguidos quando possível', () => {
    const cards = [
      { id: 1, type: 'context' },
      { id: 2, type: 'context' },
      { id: 3, type: 'cloze' },
    ];
    expect(avoidSameTypeInARow(cards).map((c) => c.type)).toEqual(['context', 'cloze', 'context']);
  });

  it('quando não dá, mantém a ordem', () => {
    const cards = [
      { id: 1, type: 'context' },
      { id: 2, type: 'context' },
    ];
    expect(avoidSameTypeInARow(cards).map((c) => c.id)).toEqual([1, 2]);
  });
});
