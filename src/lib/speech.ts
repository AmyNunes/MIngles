import * as Speech from 'expo-speech';

import { useSettings } from '@/stores/settingsStore';

const SLOW_FACTOR = 0.65;

type Options = {
  slow?: boolean;
  /** Multiplica a velocidade de Configurações › Voz (ex.: 0.8 no podcast). */
  rateFactor?: number;
  /** Só quando a leitura termina naturalmente (não ao parar). */
  onDone?: () => void;
  /** Quando a leitura acaba por qualquer motivo (fim, parada ou erro). */
  onEnd?: () => void;
};

/** Lê um texto em inglês com o sotaque e a velocidade de Configurações › Voz. */
export function speak(text: string, options: Options = {}): void {
  const clean = text.trim();
  if (!clean) return;
  const { rate, accent } = useSettings.getState().voice;
  Speech.stop();
  Speech.speak(clean, {
    language: accent,
    rate: (options.slow ? rate * SLOW_FACTOR : rate) * (options.rateFactor ?? 1),
    onDone: () => {
      options.onDone?.();
      options.onEnd?.();
    },
    onStopped: options.onEnd,
    onError: options.onEnd,
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}
