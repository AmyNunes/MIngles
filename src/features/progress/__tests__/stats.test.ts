import { notebookWithTrend, sampleSentences, trendOf, weekStatsFrom, wordUsage } from '../stats';

const day = (date: string, patch: Partial<{ reviews: number; newCards: number; wordsWritten: number; minimalDay: boolean }> = {}) => ({
  date,
  reviews: 0,
  newCards: 0,
  wordsWritten: 0,
  minimalDay: false,
  sessionSteps: {},
  ...patch,
});

describe('estatísticas de progresso', () => {
  it('resumo da semana soma os dias e conta dias ativos', () => {
    const stats = weekStatsFrom({
      weekStart: '2026-10-19',
      weekEnd: '2026-10-25',
      activity: [day('2026-10-19', { reviews: 30, newCards: 5 }), day('2026-10-20', { wordsWritten: 120 }), day('2026-10-21')],
      reviewTotals: { total: 30, good: 24 },
      errors: [{ category: 'preposition', n: 7 }],
    });
    expect(stats).toMatchObject({ reviews: 30, newCards: 5, wordsWritten: 120, activeDays: 2, accuracy: 0.8 });
    expect(stats.topCategories[0].category).toBe('preposition');
  });

  it('tendência ↑ ↓ → entre as duas metades do período', () => {
    expect(trendOf(6, 2)).toBe('up');
    expect(trendOf(1, 5)).toBe('down');
    expect(trendOf(4, 4)).toBe('flat');
    expect(trendOf(3, 0)).toBe('up');
  });

  it('caderno junta as contagens e ordena pelo total', () => {
    const list = notebookWithTrend([{ category: 'article', n: 5 }], [{ category: 'article', n: 1 }, { category: 'preposition', n: 9 }]);
    expect(list.map((c) => c.category)).toEqual(['preposition', 'article']);
    expect(list[1]).toMatchObject({ total: 6, trend: 'up' });
    expect(list[0].trend).toBe('down');
  });

  it('uso de palavras conta muletas e o total', () => {
    const usage = wordUsage(['It was very very good. I got a lot of things.']);
    expect(usage.totalWords).toBe(11);
    expect(usage.counts[0]).toEqual({ word: 'very', count: 2 });
    expect(usage.counts.find((c) => c.word === 'a lot')?.count).toBe(1);
  });

  it('frases de amostra ignoram frases curtas', () => {
    const sample = sampleSentences(['Hi. This is a longer sentence with words. Ok.']);
    expect(sample).toEqual(['This is a longer sentence with words.']);
  });
});
