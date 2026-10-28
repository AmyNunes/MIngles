import { isInQuietHours, planNotifications, thinkTimes, seededRandom, type PlanInput } from '../plan';
import { notificationSettingsSchema, NOTIFICATION_TYPES, type NotificationSettings } from '../types';

// segunda-feira, 19/10/2026, 07:00 (horário local)
const now = new Date(2026, 9, 19, 7, 0);

function settings(patch: Partial<NotificationSettings> = {}): NotificationSettings {
  return { ...notificationSettingsSchema.parse({}), lastOpenedAt: now.toISOString(), ...patch };
}

function input(patch: Partial<PlanInput> = {}): PlanInput {
  return {
    now,
    settings: settings(),
    visibleTypes: NOTIFICATION_TYPES,
    reviewCountAt: () => 24,
    doneToday: {},
    lastComebackAt: null,
    rehearsals: [],
    ...patch,
  };
}

const ofType = (plan: ReturnType<typeof planNotifications>, type: string) => plan.filter((p) => p.type === type);

describe('agendador de notificações', () => {
  it('agenda a revisão às 08:30 todos os dias, com a contagem certa', () => {
    const plan = planNotifications(input());
    const reviews = ofType(plan, 'review');
    expect(reviews).toHaveLength(7);
    expect(reviews[0].at).toEqual(new Date(2026, 9, 19, 8, 30));
    expect(reviews[0].body).toMatch(/24 cartões/);
    expect(reviews[0].url).toBe('/review');
  });

  it('não avisa a revisão se houver menos cards que o mínimo', () => {
    const plan = planNotifications(
      input({ settings: settings({ review: { enabled: true, time: '08:30', days: [0, 1, 2, 3, 4, 5, 6], minCards: 30 } }) }),
    );
    expect(ofType(plan, 'review')).toHaveLength(0);
  });

  it('tipo já concluído hoje: o lembrete de hoje sai, os dos outros dias ficam', () => {
    const plan = planNotifications(input({ doneToday: { journal: true } }));
    const journal = ofType(plan, 'journal');
    expect(journal).toHaveLength(6);
    expect(journal[0].at.getDate()).toBe(20);
  });

  it('horário silencioso: nada é agendado dentro dele (atravessando a meia-noite)', () => {
    const quiet = { enabled: true, start: '20:00', end: '09:00' };
    expect(isInQuietHours(new Date(2026, 9, 19, 21, 0), quiet)).toBe(true);
    expect(isInQuietHours(new Date(2026, 9, 19, 8, 59), quiet)).toBe(true);
    expect(isInQuietHours(new Date(2026, 9, 19, 9, 0), quiet)).toBe(false);

    const plan = planNotifications(input({ settings: settings({ quiet }) }));
    expect(ofType(plan, 'review')).toHaveLength(0); // 08:30 cai no silêncio
    expect(ofType(plan, 'journal')).toHaveLength(0); // 21:00 também
    expect(ofType(plan, 'challenge')).toHaveLength(7); // 12:30 passa
  });

  it('pausa: nada até a data de retorno; "até eu voltar" não agenda nada', () => {
    const pausedUntil = new Date(2026, 9, 22, 0, 0).toISOString();
    const plan = planNotifications(input({ settings: settings({ pausedUntil }) }));
    expect(plan.every((p) => p.at.getTime() >= new Date(pausedUntil).getTime())).toBe(true);
    expect(plan.length).toBeGreaterThan(0);

    expect(planNotifications(input({ settings: settings({ pausedForever: true }) }))).toEqual([]);
    expect(planNotifications(input({ settings: settings({ enabled: false }) }))).toEqual([]);
  });

  it('máximo por dia: ficam os tipos de maior prioridade', () => {
    const order = ['journal', 'challenge', 'review', 'think', 'weekly', 'rehearsal', 'comeback'] as const;
    const plan = planNotifications(input({ settings: settings({ maxPerDay: 2, order: [...order] }) }));
    const today = plan.filter((p) => p.at.getDate() === 19);
    expect(today.map((p) => p.type).sort()).toEqual(['challenge', 'journal']);
  });

  it('só agenda tipos visíveis na Central', () => {
    const plan = planNotifications(input({ visibleTypes: ['review'] }));
    expect(new Set(plan.map((p) => p.type))).toEqual(new Set(['review']));
  });

  it('"Pense em inglês": horários na janela, com 90 min ou mais entre eles', () => {
    const times = thinkTimes('09:00', '20:00', 5, seededRandom('x'));
    expect(times).toHaveLength(5);
    expect(times[0]).toBeGreaterThanOrEqual(9 * 60);
    expect(times.at(-1)).toBeLessThanOrEqual(20 * 60);
    for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(90);
  });

  it('"Pense em inglês": janela curta reduz a quantidade', () => {
    expect(thinkTimes('09:00', '11:00', 5, seededRandom('y'))).toHaveLength(2);
  });

  it('retorno gentil: N dias depois da última abertura, no máximo 1 por semana', () => {
    const plan = planNotifications(input());
    const comeback = ofType(plan, 'comeback');
    expect(comeback).toHaveLength(1);
    expect(comeback[0].at).toEqual(new Date(2026, 9, 22, 10, 0));
    expect(comeback[0].url).toBe('/review?minimal=1');

    const recent = planNotifications(input({ lastComebackAt: new Date(2026, 9, 18, 10, 0) }));
    expect(ofType(recent, 'comeback')).toHaveLength(0);
  });

  it('resumo semanal no dia e horário configurados', () => {
    const weekly = ofType(planNotifications(input()), 'weekly');
    expect(weekly).toHaveLength(1);
    expect(weekly[0].at).toEqual(new Date(2026, 9, 25, 18, 0)); // domingo
  });

  it('ensaio: 1 dia e/ou 3 h antes do evento', () => {
    const eventAt = new Date(2026, 9, 21, 15, 0);
    const plan = planNotifications(
      input({
        rehearsals: [{ id: 'r1', title: 'reunião com cliente', eventAt }],
        settings: settings({ rehearsal: { enabled: true, lead: 'both' } }),
      }),
    );
    const rehearsal = ofType(plan, 'rehearsal');
    expect(rehearsal.map((r) => r.at)).toEqual([new Date(2026, 9, 20, 15, 0), new Date(2026, 9, 21, 12, 0)]);
    expect(rehearsal[0].body).toMatch(/Amanhã: reunião com cliente/);
    expect(rehearsal[0].url).toBe('/practice/rehearsals/r1');
  });
});
