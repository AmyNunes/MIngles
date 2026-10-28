import { AppState } from 'react-native';

import { onAppEvent } from '@/features/app/events';
import { registerAppService } from '@/features/app/useAppServices';
import { useSettings } from '@/stores/settingsStore';

import { registerNotificationTask } from './backgroundTask';
import { configureForegroundPresentation, listenNotificationResponses } from './handlers';
import { requestReschedule } from './scheduler';

/**
 * Liga as notificações ao app: reagenda ao abrir, ao mudar configurações,
 * ao terminar a revisão/diário/desafio e ao criar/editar ensaios (seção 9.4).
 */
export function registerNotificationService(): void {
  registerAppService(() => {
    configureForegroundPresentation();
    void registerNotificationTask();

    const touchOpened = () => {
      void useSettings.getState().update('notifications', { lastOpenedAt: new Date().toISOString() });
    };
    touchOpened();
    requestReschedule();

    const stopResponses = listenNotificationResponses();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        touchOpened();
        requestReschedule();
      }
    });
    const stopEvents = onAppEvent(() => requestReschedule());
    const stopSettings = useSettings.subscribe((state, prev) => {
      const n = state.notifications;
      const p = prev.notifications;
      // lastOpenedAt muda sozinho e já reagenda acima
      const changed =
        JSON.stringify({ ...n, lastOpenedAt: null }) !== JSON.stringify({ ...p, lastOpenedAt: null }) ||
        state.study !== prev.study;
      if (changed) requestReschedule();
    });

    return () => {
      stopResponses();
      appState.remove();
      stopEvents();
      stopSettings();
    };
  });
}
