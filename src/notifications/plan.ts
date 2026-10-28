import { addDays, formatTimeOfDay, localDateKey, parseTimeOfDay } from '@/lib/dates';

import { notificationContent, type ContentParams } from './content';
import { normalizedOrder, urlFor, type NotificationSettings, type NotificationType } from './types';

export type PlannedNotification = {
  type: NotificationType;
  at: Date;
  title: string;
  body: string;
  url: string;
};

export type PlanInput = {
  now: Date;
  settings: NotificationSettings;
  /** Tipos liberados na Central (os outros não são agendados). */
  visibleTypes: readonly NotificationType[];
  /** Quantos cards estarão esperando num horário (pelo `due` do FSRS). */
  reviewCountAt: (at: Date) => number;
  /** Tipos já concluídos hoje (o lembrete de hoje é cancelado). */
  doneToday: Partial<Record<NotificationType, boolean>>;
  /** Último "Retorno gentil" enviado (no máximo 1 por semana). */
  lastComebackAt: Date | null;
  rehearsals: { id: string; title: string; eventAt: Date }[];
  /** Itens do desafio de hoje, se já gerado (para o texto). */
  challengeItems?: string[];
  weeklyStats?: { reviews: number; topCategory?: string };
};

export const HORIZON_DAYS = 7;
export const THINK_MIN_GAP_MIN = 90;
const MIN_LEAD_MS = 60_000;
const WEEK_MS = 7 * 86_400_000;

const atTime = (day: Date, hhmm: string) => {
  const m = parseTimeOfDay(hhmm);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(m / 60), m % 60);
};

const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** O horário cai no silêncio? (a janela pode atravessar a meia-noite, ex.: 22:00–08:00) */
export function isInQuietHours(at: Date, quiet: NotificationSettings['quiet']): boolean {
  if (!quiet.enabled) return false;
  const m = minutesOf(at);
  const start = parseTimeOfDay(quiet.start);
  const end = parseTimeOfDay(quiet.end);
  if (start === end) return false;
  return start < end ? m >= start && m < end : m >= start || m < end;
}

/** Gerador pseudoaleatório com semente (o mesmo dia sorteia sempre os mesmos horários). */
export function seededRandom(seed: string): () => number {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** "Pense em inglês": sorteia `count` horários na janela, com pelo menos 90 min entre eles. */
export function thinkTimes(windowStart: string, windowEnd: string, count: number, random: () => number): number[] {
  const start = parseTimeOfDay(windowStart);
  const end = parseTimeOfDay(windowEnd);
  const span = end - start;
  if (span <= 0) return [];
  const fits = Math.min(count, Math.floor(span / THINK_MIN_GAP_MIN) + 1);
  // Distribui o "tempo livre" (o que sobra além dos intervalos mínimos) ao acaso.
  const free = span - THINK_MIN_GAP_MIN * (fits - 1);
  const cuts = Array.from({ length: fits }, () => random() * free).sort((a, b) => a - b);
  return cuts.map((cut, i) => Math.round(start + cut + i * THINK_MIN_GAP_MIN));
}

/**
 * O que agendar nos próximos 7 dias (seção 9.4).
 * Função pura: recebe tudo pronto e devolve a lista em ordem de horário.
 */
export function planNotifications(input: PlanInput): PlannedNotification[] {
  const { now, settings: s } = input;
  if (!s.enabled || s.pausedForever) return [];
  const pausedUntil = s.pausedUntil ? new Date(s.pausedUntil) : null;
  const visible = new Set(input.visibleTypes);
  const on = (type: NotificationType) => visible.has(type) && s[type].enabled;
  const priority = normalizedOrder(s.order);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const out: PlannedNotification[] = [];

  for (let i = 0; i < HORIZON_DAYS; i++) {
    const day = addDays(today, i);
    const weekday = day.getDay();
    const isToday = i === 0;
    const candidates: { type: NotificationType; at: Date; params?: ContentParams; id?: string }[] = [];

    const daily = (type: 'review' | 'challenge' | 'journal') => {
      const cfg = s[type];
      if (!on(type) || !cfg.days.includes(weekday)) return;
      if (isToday && input.doneToday[type]) return;
      const at = atTime(day, cfg.time);
      if (type === 'review') {
        const count = input.reviewCountAt(at);
        if (count < s.review.minCards) return;
        candidates.push({ type, at, params: { count } });
      } else {
        candidates.push({ type, at, params: type === 'challenge' && isToday ? { items: input.challengeItems } : {} });
      }
    };
    daily('review');
    daily('challenge');
    daily('journal');

    if (on('think') && s.think.days.includes(weekday)) {
      const times = thinkTimes(s.think.windowStart, s.think.windowEnd, s.think.perDay, seededRandom(localDateKey(day)));
      for (const m of times) candidates.push({ type: 'think', at: atTime(day, formatTimeOfDay(m)) });
    }

    if (on('weekly') && s.weekly.weekday === weekday) {
      const stats = input.weeklyStats;
      candidates.push({
        type: 'weekly',
        at: atTime(day, s.weekly.time),
        params: stats ? { reviews: stats.reviews, topCategory: stats.topCategory } : {},
      });
    }

    if (on('rehearsal')) {
      for (const r of input.rehearsals) {
        const leads: ('dayBefore' | 'threeHours')[] =
          s.rehearsal.lead === 'both' ? ['dayBefore', 'threeHours'] : [s.rehearsal.lead];
        for (const lead of leads) {
          const at = new Date(r.eventAt.getTime() - (lead === 'dayBefore' ? 86_400_000 : 3 * 3_600_000));
          if (localDateKey(at) === localDateKey(day)) {
            candidates.push({ type: 'rehearsal', at, id: r.id, params: { title: r.title, tomorrow: lead === 'dayBefore' } });
          }
        }
      }
    }

    if (on('comeback')) {
      const base = s.lastOpenedAt ? new Date(s.lastOpenedAt) : now;
      const at = atTime(addDays(new Date(base.getFullYear(), base.getMonth(), base.getDate()), s.comeback.afterDays), s.comeback.time);
      const recentlySent = input.lastComebackAt && at.getTime() - input.lastComebackAt.getTime() < WEEK_MS;
      if (localDateKey(at) === localDateKey(day) && !recentlySent) candidates.push({ type: 'comeback', at });
    }

    const allowed = candidates
      .filter((c) => c.at.getTime() > now.getTime() + MIN_LEAD_MS)
      .filter((c) => !pausedUntil || c.at.getTime() >= pausedUntil.getTime())
      .filter((c) => !isInQuietHours(c.at, s.quiet))
      .sort((a, b) => priority.indexOf(a.type) - priority.indexOf(b.type) || a.at.getTime() - b.at.getTime())
      .slice(0, s.maxPerDay)
      .sort((a, b) => a.at.getTime() - b.at.getTime());

    for (const c of allowed) {
      out.push({ type: c.type, at: c.at, url: urlFor(c.type, c.id), ...notificationContent(c.type, c.at, c.params) });
    }
  }

  return out;
}
