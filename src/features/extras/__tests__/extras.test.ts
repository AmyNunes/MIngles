import type { Note } from '@/features/cards/model';

import { phraseOf, pickPhrases } from '../shadowingPhrases';
import { metricsDelta, monthKey, speakingMetrics } from '../speakingMetrics';

describe('speakingMetrics', () => {
  it('conta palavras, palavras por minuto e variedade', () => {
    const m = speakingMetrics("I think I'm better. I think so!", 30_000);
    // i, think, i'm, better, i, think, so → 7 palavras, 5 diferentes
    expect(m).toEqual({ words: 7, wpm: 14, unique: 5, variety: 71 });
  });

  it('sem texto ou sem duração, zera sem dividir por zero', () => {
    expect(speakingMetrics('', 60_000)).toEqual({ words: 0, wpm: 0, unique: 0, variety: 0 });
    expect(speakingMetrics('hello there', 0).wpm).toBe(0);
  });

  it('compara com a primeira gravação', () => {
    const first = speakingMetrics('one two three', 60_000);
    const now = speakingMetrics('one two three four five six', 60_000);
    expect(metricsDelta(now, first)).toEqual({ wpm: 3, unique: 3 });
    expect(metricsDelta(now, null)).toBeNull();
  });

  it('chave do mês com zero à esquerda', () => {
    expect(monthKey(new Date(2026, 0, 5))).toBe('2026-01');
    expect(monthKey(new Date(2026, 9, 20))).toBe('2026-10');
  });
});

const base = {
  id: 'n',
  lemma: '',
  sourceId: null,
  sourceLabel: null,
  extra: null,
  createdAt: '',
  updatedAt: '',
};

const production = (en: string): Note => ({
  ...base,
  kind: 'production',
  term: en,
  data: { pt: '', en, register: 'neutral', notePt: '', alternatives: [] },
});

describe('frases do Shadowing', () => {
  it('usa a forma em inglês e descarta frases curtas ou longas demais', () => {
    expect(phraseOf(production("I'm running late"))).toBe("I'm running late");
    expect(phraseOf(production('hello'))).toBeNull();
    expect(phraseOf(production('word '.repeat(25)))).toBeNull();
  });

  it('completa com as frases de partida, sem repetir', () => {
    const phrases = pickPhrases([production('See you   tomorrow morning'), production('see you tomorrow morning')], 3);
    expect(phrases).toHaveLength(3);
    expect(phrases[0]).toBe('See you tomorrow morning');
    expect(new Set(phrases.map((p) => p.toLowerCase())).size).toBe(3);
  });
});
