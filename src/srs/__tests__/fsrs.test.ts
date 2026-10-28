import { formatInterval, newSchedulingState, previewRatings, rateCard, retrievability } from '../fsrs';

const now = new Date('2026-10-20T12:00:00.000Z');
const addMin = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);

describe('wrapper FSRS', () => {
  it('card novo vence agora e está no estado Novo', () => {
    const s = newSchedulingState(now);
    expect(s.state).toBe(0);
    expect(new Date(s.due).getTime()).toBe(now.getTime());
    expect(retrievability(s, now, 0.9)).toBe(0);
  });

  it('prévia: intervalos crescem de Errei para Fácil', () => {
    const preview = previewRatings(newSchedulingState(now), now, 0.9);
    const due = (r: 'again' | 'hard' | 'good' | 'easy') => new Date(preview[r].next.due).getTime();
    expect(due('again')).toBeLessThanOrEqual(due('hard'));
    expect(due('hard')).toBeLessThanOrEqual(due('good'));
    expect(due('good')).toBeLessThan(due('easy'));
    expect(preview.again.interval).toMatch(/min/);
  });

  it('Errei num card em revisão volta logo (passos de reaprendizado)', () => {
    let s = newSchedulingState(now);
    s = rateCard(s, 'easy', now, 0.9);
    const later = new Date(s.due);
    const lapsed = rateCard(s, 'again', later, 0.9);
    expect(lapsed.lapses).toBe(1);
    expect(new Date(lapsed.due).getTime() - later.getTime()).toBeLessThan(60 * 60_000);
  });

  it('desfazer: o estado anterior guardado restaura o card exatamente', () => {
    const before = rateCard(newSchedulingState(now), 'good', now, 0.9);
    const snapshot = JSON.parse(JSON.stringify(before));
    const after = rateCard(before, 'hard', new Date(before.due), 0.9);
    expect(after).not.toEqual(before);
    expect(snapshot).toEqual(before);
  });

  it('retenção maior → intervalos menores', () => {
    const base = rateCard(newSchedulingState(now), 'good', now, 0.9);
    const at = new Date(base.due);
    const low = rateCard(base, 'good', at, 0.8);
    const high = rateCard(base, 'good', at, 0.97);
    expect(high.scheduledDays).toBeLessThanOrEqual(low.scheduledDays);
  });
});

describe('formatInterval', () => {
  it('formata minutos, horas, dias, meses e anos', () => {
    expect(formatInterval(now, addMin(now, 0.5))).toBe('<1 min');
    expect(formatInterval(now, addMin(now, 10))).toBe('10 min');
    expect(formatInterval(now, addMin(now, 180))).toBe('3 h');
    expect(formatInterval(now, addMin(now, 3 * 1440))).toBe('3 d');
    expect(formatInterval(now, addMin(now, 60 * 1440))).toBe('2 meses');
    expect(formatInterval(now, addMin(now, 548 * 1440))).toBe('1,5 ano');
  });
});
