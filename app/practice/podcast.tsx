import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Chip, EmptyState, ErrorState, IconButton, Screen, Segmented, Skeleton, Text } from '@/components/ui';
import { markPodcastListened, type PodcastEpisode } from '@/db/podcastsRepo';
import { createSource } from '@/db/sourcesRepo';
import { usePodcast } from '@/features/extras/usePodcast';
import { strings } from '@/i18n/strings';
import { speak, stopSpeaking } from '@/lib/speech';
import { showSnackbar } from '@/stores/snackbarStore';
import { makeStyles, TINT, useTheme, withAlpha } from '@/theme';

const p = strings.podcast;

type Speed = 'slow' | 'normal' | 'fast';
const RATE: Record<Speed, number> = { slow: 0.8, normal: 1, fast: 1.2 };
const SPEEDS = [
  { value: 'slow', label: p.speeds.slow },
  { value: 'normal', label: p.speeds.normal },
  { value: 'fast', label: p.speeds.fast },
] as const;

export default function PodcastScreen() {
  const { state, regenerate } = usePodcast();
  const title = <Stack.Screen options={{ title: p.title }} />;

  if (state.status === 'loading') {
    return (
      <Screen edges={[]}>
        {title}
        <Text color="textMuted">{p.preparing}</Text>
        <Skeleton height={240} radius="lg" />
      </Screen>
    );
  }
  if (state.status === 'error') {
    return (
      <Screen edges={[]}>
        {title}
        {state.needsAi ? (
          <EmptyState icon="cpu" message={state.message} action={{ label: strings.ai.configure, onPress: () => router.push('/settings/ai') }} />
        ) : (
          <ErrorState message={state.message} onRetry={regenerate} />
        )}
      </Screen>
    );
  }
  return (
    <>
      {title}
      <Player key={state.episode.createdAt} episode={state.episode} onRegenerate={regenerate} />
    </>
  );
}

function Player({ episode, onRegenerate }: { episode: PodcastEpisode; onRegenerate: () => void }) {
  const styles = useStyles();
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>('normal');
  const [listened, setListened] = useState(Boolean(episode.listenedAt));
  const [opening, setOpening] = useState(false);
  const total = episode.paragraphs.length;

  useEffect(() => () => stopSpeaking(), []);

  /** Lê do parágrafo `i` em diante, um por vez (dá para pular e voltar). */
  const playFrom = (i: number, rate = RATE[speed]) => {
    setIndex(i);
    setPlaying(true);
    speak(episode.paragraphs[i], {
      rateFactor: rate,
      onDone: () => {
        if (i + 1 < total) {
          playFrom(i + 1, rate);
          return;
        }
        setPlaying(false);
        setIndex(0);
        setListened(true);
        void markPodcastListened(episode.day);
        showSnackbar(p.finished);
      },
    });
  };

  const pause = () => {
    setPlaying(false);
    stopSpeaking();
  };

  const openInReader = async () => {
    setOpening(true);
    try {
      const id = await createSource({ title: episode.title, kind: 'manual', content: episode.paragraphs.join('\n\n') });
      router.push(`/reader/${id}`);
    } finally {
      setOpening(false);
    }
  };

  return (
    <Screen
      edges={['bottom']}
      footer={
        <View style={styles.footer}>
          <Segmented
            accessibilityLabel={p.speedLabel}
            options={SPEEDS}
            value={speed}
            onChange={(v) => {
              setSpeed(v);
              if (playing) playFrom(index, RATE[v]);
            }}
          />
          <View style={styles.controls}>
            <IconButton icon="skip-back" accessibilityLabel={p.previous} disabled={index === 0} onPress={() => playFrom(Math.max(0, index - 1))} />
            <View style={styles.flex}>
              <Button
                label={playing ? p.pause : p.play}
                icon={playing ? 'pause' : 'play'}
                size="main"
                onPress={() => (playing ? pause() : playFrom(index))}
              />
            </View>
            <IconButton icon="skip-forward" accessibilityLabel={p.next} disabled={index >= total - 1} onPress={() => playFrom(Math.min(total - 1, index + 1))} />
          </View>
        </View>
      }
    >
      <View style={styles.head}>
        <Text variant="title">{episode.title}</Text>
        <View style={styles.meta}>
          <Text variant="caption" color="textMuted" accessibilityLiveRegion="polite">
            {p.paragraphOf(index + 1, total)}
          </Text>
          {listened && <Chip label={p.listened} selected />}
        </View>
      </View>

      <View style={styles.paragraphs}>
        {episode.paragraphs.map((text, i) => {
          const current = i === index;
          return (
            <Pressable
              key={i}
              onPress={() => playFrom(i)}
              accessibilityRole="button"
              accessibilityLabel={p.paragraphOf(i + 1, total)}
              accessibilityHint={p.play}
              style={[styles.paragraph, current && { backgroundColor: withAlpha(theme.colors.primary, TINT) }]}
            >
              <Text variant="reading" color={current ? 'text' : 'textMuted'}>
                {text}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {episode.glossary.length > 0 && (
        <Card title={p.glossary}>
          {episode.glossary.map((g) => (
            <Text key={g.en} variant="label">{`${g.en} — ${g.pt}`}</Text>
          ))}
        </Card>
      )}

      <Button label={p.openInReader} icon="book-open" variant="secondary" loading={opening} onPress={() => void openInReader()} />
      <Button
        label={p.regenerate}
        icon="refresh-cw"
        variant="ghost"
        onPress={() => {
          pause();
          onRegenerate();
        }}
      />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  head: { gap: t.spacing.xs },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.sm },
  paragraphs: { gap: t.spacing.xs },
  paragraph: { padding: t.spacing.md, borderRadius: t.radii.md },
  footer: { gap: t.spacing.md },
  controls: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
}));
