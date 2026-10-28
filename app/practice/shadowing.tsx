import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { DiffText } from '@/components/cards/DiffText';
import { Button, Card, EmptyState, ErrorState, Notice, Screen, Skeleton, Text } from '@/components/ui';
import { loadShadowingPhrases } from '@/features/extras/shadowingPhrases';
import { isDictationAvailable, startDictation } from '@/features/voice/dictation';
import { useClipPlayer } from '@/features/voice/useClipPlayer';
import { useVoiceRecorder, type RecordedClip } from '@/features/voice/useVoiceRecorder';
import { strings } from '@/i18n/strings';
import { haptics } from '@/lib/haptics';
import { speak, stopSpeaking } from '@/lib/speech';
import { useLoader } from '@/lib/useLoader';
import { useSettings } from '@/stores/settingsStore';
import { makeStyles } from '@/theme';

const s = strings.shadowing;
/** Uma frase cabe folgada em 15 s; para sozinho depois disso. */
const MAX_CLIP_MS = 15_000;

/** Para comparar o que falei com a frase: sem maiúsculas nem pontuação. */
const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export default function ShadowingScreen() {
  const { state, reload } = useLoader(loadShadowingPhrases);
  const title = <Stack.Screen options={{ title: s.title }} />;

  if (state.status === 'loading') {
    return (
      <Screen edges={[]}>
        {title}
        <Skeleton height={220} radius="lg" />
      </Screen>
    );
  }
  if (state.status === 'error') {
    return (
      <Screen edges={[]}>
        {title}
        <ErrorState onRetry={reload} />
      </Screen>
    );
  }
  return (
    <>
      {title}
      <Session phrases={state.data} onMore={reload} />
    </>
  );
}

function Session({ phrases, onMore }: { phrases: string[]; onMore: () => void }) {
  const styles = useStyles();
  const accent = useSettings((st) => st.voice.accent);
  const [clip, setClip] = useState<RecordedClip | null>(null);
  const keepClip = (recorded: RecordedClip | null) => {
    if (!recorded) return;
    setClip(recorded);
    haptics.light();
  };
  const recorder = useVoiceRecorder({ maxDurationMs: MAX_CLIP_MS, onAutoStop: keepClip });
  const player = useClipPlayer();
  const [index, setIndex] = useState(0);
  const [heard, setHeard] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const phrase = phrases[index];

  useEffect(() => () => stopSpeaking(), []);

  const stopRecording = async () => keepClip(await recorder.stop());

  const record = async () => {
    player.stop();
    setHeard(null);
    if (await recorder.start()) haptics.light();
  };

  const compare = () => {
    if (!clip) return;
    player.stop();
    speak(phrase, { onDone: () => player.play(clip.uri) });
  };

  const check = async () => {
    stopSpeaking();
    setChecking(true);
    const session = await startDictation({
      lang: accent,
      onFinal: (text) => setHeard(text),
      onEnd: () => setChecking(false),
    });
    if (!session) setChecking(false);
  };

  const goTo = (next: number) => {
    stopSpeaking();
    player.stop();
    setClip(null);
    setHeard(null);
    setIndex(next);
  };

  if (index >= phrases.length) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon="check-circle" message={s.done} action={{ label: s.restart, onPress: onMore }} />
      </Screen>
    );
  }

  return (
    <Screen
      edges={['bottom']}
      footer={
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button label={s.again} icon="rotate-ccw" variant="secondary" onPress={() => goTo(index)} />
          </View>
          <View style={styles.flex}>
            <Button label={s.next} icon="arrow-right" onPress={() => goTo(index + 1)} />
          </View>
        </View>
      }
    >
      <Text color="textMuted">{s.intro}</Text>
      <Card>
        <Text variant="caption" color="textMuted">
          {s.phraseOf(index + 1, phrases.length)}
        </Text>
        <Text variant="cardMain">{phrase}</Text>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button label={s.listen} icon="volume-2" variant="secondary" onPress={() => speak(phrase)} />
          </View>
          <View style={styles.flex}>
            <Button label={s.listenSlow} icon="volume-1" variant="secondary" onPress={() => speak(phrase, { slow: true })} />
          </View>
        </View>
      </Card>

      <Card>
        {recorder.recording ? (
          <Button
            label={`${s.stopRecording} · ${s.recording(Math.floor(recorder.durationMs / 1000))}`}
            icon="square"
            size="main"
            onPress={() => void stopRecording()}
          />
        ) : (
          <Button label={s.record} icon="mic" size="main" variant={clip ? 'secondary' : 'primary'} onPress={() => void record()} />
        )}
        {clip && !recorder.recording && (
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button
                label={player.playing ? strings.speaking.stopPlaying : s.playMine}
                icon={player.playing ? 'square' : 'play-circle'}
                variant="secondary"
                onPress={() => (player.playing ? player.stop() : player.play(clip.uri))}
              />
            </View>
            <View style={styles.flex}>
              <Button label={s.compare} icon="repeat" variant="secondary" onPress={compare} />
            </View>
          </View>
        )}
      </Card>

      {isDictationAvailable() && (
        <Card>
          <Text variant="caption" color="textMuted">
            {s.checkHint}
          </Text>
          <Button label={checking ? strings.voice.listening : s.check} icon="mic" variant="ghost" loading={checking} onPress={() => void check()} />
          {heard != null && (
            <Notice icon="message-square">
              <Text variant="caption" color="textMuted">
                {s.heard}
              </Text>
              <DiffText original={normalize(phrase)} corrected={normalize(heard)} />
            </Notice>
          )}
        </Card>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: t.spacing.sm },
}));
