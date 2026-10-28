import type { NotificationAction } from 'expo-notifications';

import { strings } from '@/i18n/strings';

import { getNotifications } from './native';
import { NOTIFICATION_TYPES, type NotificationType } from './types';

const a = strings.notifications.actions;

export const ACTION_OPEN = 'open';
export const ACTION_LATER = 'later';

/** Categoria (botões) de cada tipo. Sem ":" ou "-" no id. */
export const categoryId = (type: NotificationType) => `cat_${type}`;

const OPEN_LABEL: Record<NotificationType, string> = {
  review: a.reviewNow,
  challenge: a.doNow,
  journal: a.write,
  think: a.answer,
  weekly: a.see,
  rehearsal: a.rehearse,
  comeback: a.start,
};

let ready = false;

/**
 * Um canal por tipo, com o mesmo nome em PT (dá para controlar também pelas
 * configurações do Android), e as categorias com os botões da tabela 9.3.
 */
export async function ensureChannelsAndCategories(): Promise<void> {
  const Notifications = getNotifications();
  if (ready || !Notifications) return;
  for (const type of NOTIFICATION_TYPES) {
    await Notifications.setNotificationChannelAsync(type, {
      name: strings.notifications.types[type],
      importance: type === 'think' ? Notifications.AndroidImportance.DEFAULT : Notifications.AndroidImportance.HIGH,
    });
    const actions: NotificationAction[] = [
      { identifier: ACTION_OPEN, buttonTitle: OPEN_LABEL[type], options: { opensAppToForeground: true } },
    ];
    if (type === 'review') {
      actions.push({ identifier: ACTION_LATER, buttonTitle: a.later, options: { opensAppToForeground: false } });
    }
    await Notifications.setNotificationCategoryAsync(categoryId(type), actions);
  }
  ready = true;
}
