import { AppState } from 'react-native';

import { onAppEvent } from '@/features/app/events';
import { registerAppService } from '@/features/app/useAppServices';

import { updateReviewWidget } from './updateWidget';
import { isWidgetAvailable } from './widgetService';

const DEBOUNCE_MS = 1000;
let registered = false;

/** Mantém o widget em dia: depois de eventos do app e ao sair dele. */
export function registerWidgetService(): void {
  if (registered || !isWidgetAvailable()) return;
  registered = true;
  registerAppService(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const update = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void updateReviewWidget().catch(() => undefined), DEBOUNCE_MS);
    };
    const stopEvents = onAppEvent(update);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') void updateReviewWidget().catch(() => undefined);
    });
    return () => {
      if (timer) clearTimeout(timer);
      stopEvents();
      sub.remove();
    };
  });
}
