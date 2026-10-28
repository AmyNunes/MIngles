import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { stopSpeaking } from '@/lib/speech';

/**
 * Toca um áudio gravado (minha voz). Um clipe por vez.
 * O `useAudioPlayer` já libera (e para) o player quando a tela fecha:
 * não chame nada nele depois disso, porque o objeto nativo já não existe.
 */
export function useClipPlayer() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  const play = (uri: string) => {
    stopSpeaking();
    try {
      player.replace({ uri });
      player.play();
    } catch {
      // player já liberado (a tela fechou): nada a tocar
    }
  };

  const stop = () => {
    try {
      player.pause();
      void player.seekTo(0).catch(() => undefined);
    } catch {
      // idem
    }
  };

  return { playing: status.playing, play, stop };
}
