import { requireOptionalNativeModule } from 'expo';

import { strings } from '@/i18n/strings';
import { showSnackbar } from '@/stores/snackbarStore';

/**
 * O reconhecimento de voz é um módulo nativo: existe no development build e no
 * APK, mas não no Expo Go. Sem ele, os botões de microfone simplesmente não aparecem.
 */
export function isDictationAvailable(): boolean {
  return requireOptionalNativeModule('ExpoSpeechRecognition') != null;
}

type SpeechModule = (typeof import('expo-speech-recognition'))['ExpoSpeechRecognitionModule'];

let cached: SpeechModule | null | undefined;

async function speechModule(): Promise<SpeechModule | null> {
  if (cached !== undefined) return cached;
  if (!isDictationAvailable()) return (cached = null);
  try {
    cached = (await import('expo-speech-recognition')).ExpoSpeechRecognitionModule;
  } catch {
    cached = null;
  }
  return cached;
}

export type DictationSession = { stop: () => void; abort: () => void };

type Handlers = {
  lang: string;
  continuous?: boolean;
  onStart?: () => void;
  onInterim?: (text: string) => void;
  /** Texto final reconhecido (não é chamado se a sessão for cancelada). */
  onFinal?: (text: string) => void;
  /** Fim por qualquer motivo. */
  onEnd?: () => void;
  /** Também grava o áudio num arquivo (Android 13+; em versões antigas `uri` vem `null`). */
  persistAudio?: boolean;
  /** Arquivo gravado e duração, quando `persistAudio`. */
  onAudio?: (audio: { uri: string | null; durationMs: number }) => void;
};

/** Começa a ouvir. Devolve como parar (envia) ou cancelar (descarta), ou `null` se não deu. */
export async function startDictation(h: Handlers): Promise<DictationSession | null> {
  const mod = await speechModule();
  if (!mod) {
    showSnackbar(strings.voice.unavailable);
    return null;
  }
  const permission = await mod.requestPermissionsAsync();
  if (!permission.granted) {
    showSnackbar(strings.voice.denied);
    return null;
  }

  let finalText = '';
  let interim = '';
  let aborted = false;
  let audioStartedAt = 0;
  const subs = [
    mod.addListener('start', () => h.onStart?.()),
    mod.addListener('audiostart', (e) => {
      audioStartedAt = e.timestamp;
    }),
    mod.addListener('audioend', (e) => {
      if (h.persistAudio && !aborted) h.onAudio?.({ uri: e.uri, durationMs: Math.max(0, e.timestamp - audioStartedAt) });
    }),
    mod.addListener('result', (e) => {
      const text = e.results[0]?.transcript ?? '';
      if (e.isFinal) {
        finalText = `${finalText} ${text}`.trim();
        interim = '';
        h.onInterim?.(finalText);
      } else {
        interim = text;
        h.onInterim?.(`${finalText} ${text}`.trim());
      }
    }),
    mod.addListener('error', (e) => {
      if (e.error === 'no-speech' || e.error === 'speech-timeout') showSnackbar(strings.voice.noSpeech);
      else if (e.error === 'not-allowed') showSnackbar(strings.voice.denied);
    }),
    mod.addListener('end', () => {
      for (const s of subs) s.remove();
      const text = `${finalText} ${interim}`.trim();
      if (!aborted && text) h.onFinal?.(text);
      h.onEnd?.();
    }),
  ];

  mod.start({
    lang: h.lang,
    interimResults: true,
    continuous: h.continuous ?? false,
    ...(h.persistAudio ? { recordingOptions: { persist: true } } : {}),
  });
  return {
    stop: () => mod.stop(),
    abort: () => {
      aborted = true;
      mod.abort();
    },
  };
}
