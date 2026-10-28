import { z } from 'zod';

/** Tipos de notificação (seção 9.3), na ordem padrão de prioridade. */
export const NOTIFICATION_TYPES = [
  'review',
  'challenge',
  'journal',
  'think',
  'weekly',
  'rehearsal',
  'comeback',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * Tipos que já têm destino no app e aparecem na Central.
 * O agendador suporta todos; cada fase libera os seus (seção 14).
 */
export const VISIBLE_NOTIFICATION_TYPES: readonly NotificationType[] = ['review', 'think', 'comeback'];

const time = z.string().regex(/^\d{2}:\d{2}$/);
const days = z.array(z.number().int().min(0).max(6));
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const notificationSettingsObject = z.object({
  /** Interruptor mestre. */
  enabled: z.boolean().catch(true),
  /** Pausar tudo até esta data (ISO). */
  pausedUntil: z.string().nullable().catch(null),
  /** "Até eu voltar". */
  pausedForever: z.boolean().catch(false),
  quiet: z
    .object({ enabled: z.boolean(), start: time, end: time })
    .catch({ enabled: true, start: '22:00', end: '08:00' }),
  maxPerDay: z.number().int().min(1).max(10).catch(4),
  /** Prioridade (arrastar ≡): quando passar do limite do dia, ficam os primeiros. */
  order: z.array(z.enum(NOTIFICATION_TYPES)).catch([...NOTIFICATION_TYPES]),
  review: z
    .object({ enabled: z.boolean(), time, days, minCards: z.number().int().min(1).max(200) })
    .catch({ enabled: true, time: '08:30', days: ALL_DAYS, minCards: 1 }),
  challenge: z.object({ enabled: z.boolean(), time, days }).catch({ enabled: true, time: '12:30', days: ALL_DAYS }),
  journal: z.object({ enabled: z.boolean(), time, days }).catch({ enabled: true, time: '21:00', days: ALL_DAYS }),
  think: z
    .object({
      enabled: z.boolean(),
      windowStart: time,
      windowEnd: time,
      perDay: z.number().int().min(1).max(5),
      days,
    })
    .catch({ enabled: false, windowStart: '09:00', windowEnd: '20:00', perDay: 2, days: ALL_DAYS }),
  weekly: z
    .object({ enabled: z.boolean(), weekday: z.number().int().min(0).max(6), time })
    .catch({ enabled: true, weekday: 0, time: '18:00' }),
  rehearsal: z
    .object({ enabled: z.boolean(), lead: z.enum(['dayBefore', 'threeHours', 'both']) })
    .catch({ enabled: true, lead: 'dayBefore' as const }),
  comeback: z
    .object({ enabled: z.boolean(), afterDays: z.number().int().min(1).max(14), time })
    .catch({ enabled: true, afterDays: 3, time: '10:00' }),
  /** Última vez que o app foi aberto (para o "Retorno gentil"). */
  lastOpenedAt: z.string().nullable().catch(null),
});

export const notificationSettingsSchema = notificationSettingsObject.catch(() =>
  notificationSettingsObject.parse({}),
);

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

/** Garante que a ordem tenha todos os tipos, sem repetir. */
export function normalizedOrder(order: NotificationType[]): NotificationType[] {
  const seen = new Set<NotificationType>();
  const out: NotificationType[] = [];
  for (const t of [...order, ...NOTIFICATION_TYPES]) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

/** Destino (deep link) de cada tipo (seção 5.3). */
export function urlFor(type: NotificationType, id?: string): string {
  switch (type) {
    case 'review':
      return '/review';
    case 'challenge':
      return '/practice/challenge';
    case 'journal':
      return '/practice/journal';
    case 'think':
      return '/capture?mode=think';
    case 'weekly':
      return '/progress/weekly/latest';
    case 'rehearsal':
      return id ? `/practice/rehearsals/${id}` : '/practice/rehearsals';
    case 'comeback':
      return '/review?minimal=1';
  }
}
