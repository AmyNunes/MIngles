import { strings } from '@/i18n/strings';
import { formatMinutes } from '@/lib/format';
import { SECONDS_PER_CARD } from '@/srs/constants';

import type { NotificationType } from './types';

const n = strings.notifications;

/** Escolhe uma variação de texto de forma estável para o dia (não muda ao reagendar). */
export function pickVariant<T>(variants: readonly T[], date: Date, salt = 0): T {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return variants[(dayOfYear + salt) % variants.length];
}

export type ContentParams = {
  /** Revisão: quantos cards. */
  count?: number;
  /** Desafio: itens obrigatórios do dia, se já gerado. */
  items?: string[];
  /** Resumo semanal: números da semana. */
  reviews?: number;
  topCategory?: string;
  /** Ensaio: título e quando. */
  title?: string;
  tomorrow?: boolean;
};

/** Título e texto de cada tipo, com 3–5 variações gentis (seção 9.3). */
export function notificationContent(
  type: NotificationType,
  date: Date,
  params: ContentParams = {},
): { title: string; body: string } {
  const title = n.types[type];
  switch (type) {
    case 'review': {
      const count = params.count ?? 0;
      return { title, body: pickVariant(n.texts.review, date)(count, formatMinutes(count * SECONDS_PER_CARD)) };
    }
    case 'challenge':
      return {
        title,
        body: params.items?.length ? n.texts.challengeWithItems(params.items) : pickVariant(n.texts.challenge, date),
      };
    case 'journal':
      return { title, body: pickVariant(n.texts.journal, date) };
    case 'think':
      return { title, body: pickVariant(n.texts.think, date, date.getHours()) };
    case 'weekly':
      return {
        title,
        body:
          params.reviews != null ? n.texts.weeklyWithStats(params.reviews, params.topCategory) : pickVariant(n.texts.weekly, date),
      };
    case 'rehearsal':
      return { title, body: n.texts.rehearsal(params.title ?? '', params.tomorrow ?? true) };
    case 'comeback':
      return { title, body: pickVariant(n.texts.comeback, date) };
  }
}
