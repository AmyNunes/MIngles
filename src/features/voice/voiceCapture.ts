import { router } from 'expo-router';
import { create } from 'zustand';

import { haptics } from '@/lib/haptics';
import { useSettings } from '@/stores/settingsStore';

import { startDictation, type DictationSession } from './dictation';

type Phase = 'idle' | 'listening' | 'locked' | 'cancelling';

type VoiceCaptureState = {
  phase: Phase;
  text: string;
};

/** Estado da "captura por voz segurando o +" (seção 6.1). */
export const useVoiceCapture = create<VoiceCaptureState>()(() => ({ phase: 'idle', text: '' }));

let session: DictationSession | null = null;
let sendOnEnd = false;

const set = (patch: Partial<VoiceCaptureState>) => useVoiceCapture.setState(patch);

/** "Como eu digo?" é falado em português; os outros modos, em inglês. */
function captureLang(): { lang: string; mode: string } {
  const mode = useSettings.getState().capture.lastMode;
  return { mode, lang: mode === 'howDoISay' ? 'pt-BR' : useSettings.getState().voice.accent };
}

export async function startVoiceCapture(): Promise<void> {
  if (useVoiceCapture.getState().phase !== 'idle') return;
  const { lang, mode } = captureLang();
  sendOnEnd = false;
  set({ phase: 'listening', text: '' });
  haptics.medium();
  session = await startDictation({
    lang,
    continuous: true,
    onInterim: (text) => set({ text }),
    onFinal: (text) => {
      if (sendOnEnd) {
        router.push({ pathname: '/capture', params: { mode, text, autosend: '1' } });
      }
    },
    onEnd: () => {
      session = null;
      set({ phase: 'idle', text: '' });
    },
  });
  if (!session) set({ phase: 'idle' });
}

/** Deslizou ↑: continua ouvindo sem precisar segurar. */
export function lockVoiceCapture(): void {
  if (useVoiceCapture.getState().phase !== 'listening') return;
  haptics.light();
  set({ phase: 'locked' });
}

/** Deslizou ← (mostra "solte para cancelar") ou voltou. */
export function setVoiceCancelling(cancelling: boolean): void {
  const { phase } = useVoiceCapture.getState();
  if (phase === 'listening' && cancelling) set({ phase: 'cancelling' });
  else if (phase === 'cancelling' && !cancelling) set({ phase: 'listening' });
}

/** Soltou o dedo (ou tocou em Enviar com a gravação travada). */
export function finishVoiceCapture(): void {
  const { phase } = useVoiceCapture.getState();
  if (phase === 'cancelling') return cancelVoiceCapture();
  if (phase === 'idle') return;
  sendOnEnd = true;
  session?.stop();
}

export function cancelVoiceCapture(): void {
  sendOnEnd = false;
  session?.abort();
  set({ phase: 'idle', text: '' });
}
