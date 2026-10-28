import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef } from 'react';

import { strings } from '@/i18n/strings';
import { stopSpeaking } from '@/lib/speech';
import { showSnackbar } from '@/stores/snackbarStore';

const STATUS_INTERVAL_MS = 250;

export type RecordedClip = { uri: string; durationMs: number };

type Options = {
  /** Para sozinho depois deste tempo. */
  maxDurationMs?: number;
  /** Chamado quando parou sozinho pelo tempo. */
  onAutoStop?: (clip: RecordedClip | null) => void;
};

/** Gravador de voz (`expo-audio`): Shadowing e Gravação mensal sem reconhecimento de voz. */
export function useVoiceRecorder(options: Options = {}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, STATUS_INTERVAL_MS);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAutoStop = useRef(options.onAutoStop);

  useEffect(() => {
    onAutoStop.current = options.onAutoStop;
  });

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const stop = async (): Promise<RecordedClip | null> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    try {
      const status = recorder.getStatus();
      if (!status.isRecording) return null;
      await recorder.stop();
      return recorder.uri ? { uri: recorder.uri, durationMs: status.durationMillis } : null;
    } catch {
      // gravador já liberado (a tela fechou no meio da gravação)
      return null;
    } finally {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    }
  };

  const start = async (): Promise<boolean> => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      showSnackbar(strings.voice.denied);
      return false;
    }
    stopSpeaking();
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      showSnackbar(strings.recording.failed);
      return false;
    }
    if (options.maxDurationMs) {
      timer.current = setTimeout(() => {
        void stop().then((clip) => onAutoStop.current?.(clip));
      }, options.maxDurationMs);
    }
    return true;
  };

  return { recording: state.isRecording, durationMs: state.durationMillis, start, stop };
}
