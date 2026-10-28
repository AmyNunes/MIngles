import { useEffect, useState } from 'react';

import { insertRecording } from '@/db/speakingRepo';
import { isDictationAvailable, startDictation, type DictationSession } from '@/features/voice/dictation';
import { useVoiceRecorder, type RecordedClip } from '@/features/voice/useVoiceRecorder';
import { strings } from '@/i18n/strings';
import { useSettings } from '@/stores/settingsStore';
import { showSnackbar } from '@/stores/snackbarStore';

import { keepRecording } from './recordingFiles';
import { monthKey } from './speakingMetrics';

export const MAX_RECORDING_MS = 120_000;
const MIN_RECORDING_MS = 10_000;
const TICK_MS = 500;

/**
 * Grava a resposta do mês. Com reconhecimento de voz (APK), sai áudio + transcrição;
 * sem ele (Expo Go), só o áudio, e a transcrição pode ser escrita depois.
 */
export function useSpeakingRecorder(onSaved: () => void) {
  const accent = useSettings((s) => s.voice.accent);
  const recorder = useVoiceRecorder({ maxDurationMs: MAX_RECORDING_MS, onAutoStop: (clip) => void save(clip, '') });
  const [dictation, setDictation] = useState<DictationSession | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [live, setLive] = useState('');
  const [saving, setSaving] = useState(false);
  const recording = startedAt != null;

  // Relógio da gravação (e parada automática no ditado).
  useEffect(() => {
    if (startedAt == null) return;
    const id = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setElapsedMs(elapsed);
      if (elapsed >= MAX_RECORDING_MS) dictation?.stop();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [startedAt, dictation]);

  useEffect(() => () => dictation?.abort(), [dictation]);

  async function save(clip: RecordedClip | null, transcript: string) {
    setStartedAt(null);
    setDictation(null);
    setLive('');
    if (!clip || clip.durationMs < MIN_RECORDING_MS) {
      showSnackbar(strings.speaking.tooShort);
      return;
    }
    setSaving(true);
    try {
      const audioPath = clip.uri ? await keepRecording(clip.uri) : null;
      await insertRecording({
        month: monthKey(new Date()),
        question: strings.speaking.question,
        audioPath,
        transcript,
        durationMs: Math.round(clip.durationMs),
      });
      showSnackbar(strings.speaking.saved);
      onSaved();
    } catch {
      showSnackbar(strings.common.genericError);
    } finally {
      setSaving(false);
    }
  }

  const start = async () => {
    setElapsedMs(0);
    if (!isDictationAvailable()) {
      if (await recorder.start()) setStartedAt(Date.now());
      return;
    }
    let text = '';
    let audio: { uri: string | null; durationMs: number } | null = null;
    const began = Date.now();
    const session = await startDictation({
      lang: accent,
      continuous: true,
      persistAudio: true,
      onInterim: setLive,
      onFinal: (t) => {
        text = t;
      },
      onAudio: (a) => {
        audio = a;
      },
      onEnd: () => {
        const durationMs = audio?.durationMs || Date.now() - began;
        void save({ uri: audio?.uri ?? '', durationMs }, text);
      },
    });
    if (session) {
      setDictation(session);
      setStartedAt(began);
    }
  };

  const stop = async () => {
    if (dictation) {
      dictation.stop();
      return;
    }
    await save(await recorder.stop(), '');
  };

  return { recording, elapsedMs, live, saving, start, stop };
}
