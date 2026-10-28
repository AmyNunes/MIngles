import type { IconName } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { weekdayInitial, weekdayShort } from '@/lib/dates';
import type { ColorTokens } from '@/theme';

import type { NotificationSettings, NotificationType } from './types';

const c = strings.notifications.center;

/** Ícone Feather e cor de cada tipo (os emojis da spec são só ilustração). */
export const TYPE_ICONS: Record<NotificationType, { icon: IconName; color: keyof ColorTokens }> = {
  review: { icon: 'layers', color: 'primary' },
  challenge: { icon: 'edit-3', color: 'typeProduction' },
  journal: { icon: 'book', color: 'typeCloze' },
  think: { icon: 'message-circle', color: 'rateEasy' },
  weekly: { icon: 'bar-chart-2', color: 'rateGood' },
  rehearsal: { icon: 'users', color: 'typeError' },
  comeback: { icon: 'sunrise', color: 'rateHard' },
};

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function daysLabel(days: number[]): string {
  if (days.length === 7) return c.everyDay;
  return ORDER.filter((d) => days.includes(d)).map(weekdayInitial).join(' ');
}

/** Resumo de uma linha, como na seção 9.1 ("08:30 · S T Q Q S S D"). */
export function typeSummary(type: NotificationType, s: NotificationSettings): string {
  switch (type) {
    case 'review':
    case 'challenge':
    case 'journal':
      return `${s[type].time} · ${daysLabel(s[type].days)}`;
    case 'think':
      return `${c.perDay(s.think.perDay)}, ${s.think.windowStart}–${s.think.windowEnd}`;
    case 'weekly':
      return `${weekdayShort(s.weekly.weekday)} ${s.weekly.time}`;
    case 'rehearsal':
      return c.leadLabels[s.rehearsal.lead];
    case 'comeback':
      return c.afterDays(s.comeback.afterDays);
  }
}
