import * as Haptics from 'expo-haptics';

import { useSettings } from '@/stores/settingsStore';

/** Vibração sutil e desligável (Configurações › Gestos › Vibração). */
const enabled = () => useSettings.getState().gestures.haptics;

export const haptics = {
  /** Ao virar o card e ao cruzar o limite de um gesto. */
  light: () => {
    if (enabled()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** Ao confirmar uma avaliação. */
  medium: () => {
    if (enabled()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  /** Ao concluir a sessão do dia. */
  success: () => {
    if (enabled()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  },
  warning: () => {
    if (enabled()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  },
};
