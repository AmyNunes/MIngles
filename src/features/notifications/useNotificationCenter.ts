import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { notificationHistory } from '@/db/notificationLogRepo';
import { DAY } from '@/lib/dates';
import { useLoader } from '@/lib/useLoader';
import {
  notificationPermission,
  requestNotificationPermission,
  type PermissionState,
} from '@/notifications/permissions';
import { visibleNotificationTypes } from '@/notifications/scheduler';
import { normalizedOrder, type NotificationSettings, type NotificationType } from '@/notifications/types';
import { useSettings } from '@/stores/settingsStore';

export type PauseOption = 'day' | 'threeDays' | 'week' | 'forever';
const PAUSE_DAYS: Record<Exclude<PauseOption, 'forever'>, number> = { day: 1, threeDays: 3, week: 7 };

/** Estado e ações da Central de Notificações (seção 9). */
export function useNotificationCenter() {
  const settings = useSettings((s) => s.notifications);
  const update = useSettings((s) => s.update);
  const [permission, setPermission] = useState<PermissionState | null>(null);

  useEffect(() => {
    const check = () => notificationPermission().then(setPermission, () => setPermission('blocked'));
    void check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void check());
    return () => sub.remove();
  }, []);

  const history = useLoader(() => {
    const now = Date.now();
    return notificationHistory(new Date(now - 7 * DAY).toISOString(), new Date(now).toISOString());
  });

  const set = (patch: Partial<NotificationSettings>) => update('notifications', patch);
  const visible = visibleNotificationTypes();
  const order = normalizedOrder(settings.order).filter((t) => visible.includes(t));

  return {
    settings,
    permission,
    history,
    order,
    askPermission: async () => setPermission(await requestNotificationPermission()),
    setEnabled: (enabled: boolean) => set({ enabled }),
    pause: (option: PauseOption) =>
      option === 'forever'
        ? set({ pausedForever: true, pausedUntil: null })
        : set({ pausedForever: false, pausedUntil: new Date(Date.now() + PAUSE_DAYS[option] * DAY).toISOString() }),
    resume: () => set({ pausedForever: false, pausedUntil: null }),
    setQuiet: (patch: Partial<NotificationSettings['quiet']>) => set({ quiet: { ...settings.quiet, ...patch } }),
    setMaxPerDay: (maxPerDay: number) => set({ maxPerDay }),
    reorder: (visibleOrder: string[]) => {
      const hidden = normalizedOrder(settings.order).filter((t) => !visible.includes(t));
      set({ order: [...(visibleOrder as NotificationType[]), ...hidden] });
    },
    toggleType: (type: NotificationType, enabled: boolean) =>
      set({ [type]: { ...settings[type], enabled } } as Partial<NotificationSettings>),
  };
}

/** Pausado agora? Devolve a data de retorno, `forever` ou `null`. */
export function pauseState(s: NotificationSettings): Date | 'forever' | null {
  if (s.pausedForever) return 'forever';
  if (s.pausedUntil && new Date(s.pausedUntil).getTime() > Date.now()) return new Date(s.pausedUntil);
  return null;
}
