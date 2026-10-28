import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { toAIError } from '@/ai/client';
import { StatTiles } from '@/components/progress/StatTiles';
import { Button, Card, EmptyState, ErrorState, IconButton, Notice, Screen, Sheet, Skeleton, Text, TextField } from '@/components/ui';
import { deleteRecording, listRecordings, restoreRecording, updateRecordingTranscript, type SpeakingRecording } from '@/db/speakingRepo';
import { cleanupOrphanRecordings, recordingExists } from '@/features/extras/recordingFiles';
import { metricsDelta, monthKey, speakingMetrics } from '@/features/extras/speakingMetrics';
import { useSpeakingRecorder } from '@/features/extras/useSpeakingRecorder';
import { runCorrection } from '@/features/production/correctionService';
import { useClipPlayer } from '@/features/voice/useClipPlayer';
import { strings } from '@/i18n/strings';
import { formatDayMonth, formatMonthYear } from '@/lib/dates';
import { useLoader } from '@/lib/useLoader';
import { openActionSheet } from '@/stores/actionSheetStore';
import { showSnackbar } from '@/stores/snackbarStore';
import { makeStyles } from '@/theme';

const s = strings.speaking;

/** Lista com o que a tela precisa já calculado (render puro). */
async function loadRecordings() {
  const items = await listRecordings();
  const thisMonth = monthKey(new Date());
  return {
    items: items.map((r) => ({ ...r, metrics: speakingMetrics(r.transcript, r.durationMs), hasAudio: recordingExists(r.audioPath) })),
    doneThisMonth: items.find((r) => r.month === thisMonth) ?? null,
  };
}

type Item = Awaited<ReturnType<typeof loadRecordings>>['items'][number];

export default function SpeakingScreen() {
  const styles = useStyles();
  const { state, reload, refresh } = useLoader(loadRecordings);
  const rec = useSpeakingRecorder(refresh);
  const player = useClipPlayer();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [correcting, setCorrecting] = useState<string | null>(null);

  // Áudios de gravações excluídas (o "Desfazer" já passou) saem ao abrir a tela.
  useEffect(() => {
    void listRecordings()
      .then((rows) => cleanupOrphanRecordings(new Set(rows.flatMap((r) => (r.audioPath ? [r.audioPath] : [])))))
      .catch(() => undefined);
  }, []);

  const togglePlay = (item: Item) => {
    if (playingId === item.id && player.playing) {
      player.stop();
      setPlayingId(null);
      return;
    }
    if (!item.audioPath) return;
    setPlayingId(item.id);
    player.play(item.audioPath);
  };

  const correct = async (item: SpeakingRecording) => {
    setCorrecting(item.id);
    try {
      const { id } = await runCorrection({ text: item.transcript, mode: 'conversation', origin: 'speaking', originId: item.id });
      router.push(`/practice/correction/${id}`);
    } catch (e) {
      showSnackbar(toAIError(e).messagePt);
    } finally {
      setCorrecting(null);
    }
  };

  const remove = async (item: SpeakingRecording) => {
    if (playingId === item.id) player.stop();
    const removed = await deleteRecording(item.id);
    refresh();
    showSnackbar(s.deleted, {
      label: strings.common.undo,
      onPress: async () => {
        if (removed) await restoreRecording(removed);
        refresh();
      },
    });
  };

  const saveTranscript = async () => {
    if (!editing) return;
    await updateRecordingTranscript(editing.id, editing.text.trim());
    setEditing(null);
    refresh();
  };

  const data = state.status === 'success' ? state.data : null;
  const first = data ? [...data.items].reverse().find((r) => r.metrics.words > 0) : undefined;
  const seconds = Math.floor(rec.elapsedMs / 1000);

  return (
    <Screen
      edges={['bottom']}
      footer={
        rec.recording ? (
          <Button label={`${s.stop} · ${s.recording(seconds)}`} icon="square" size="main" onPress={() => void rec.stop()} />
        ) : (
          <Button
            label={data?.doneThisMonth ? s.recordAgain : s.record}
            icon="mic"
            size="main"
            variant={data?.doneThisMonth ? 'secondary' : 'primary'}
            loading={rec.saving}
            onPress={() => void rec.start()}
          />
        )
      }
    >
      <Stack.Screen options={{ title: s.title }} />
      <Card>
        <Text variant="heading">{s.question}</Text>
        <Text color="textMuted">{s.questionPt}</Text>
        <Text variant="caption" color="textMuted">
          {s.howTo}
        </Text>
      </Card>

      {rec.recording && rec.live ? (
        <Notice icon="mic">
          <Text accessibilityLiveRegion="polite">{rec.live}</Text>
        </Notice>
      ) : null}

      {state.status === 'loading' && <Skeleton height={160} radius="lg" />}
      {state.status === 'error' && <ErrorState onRetry={reload} />}
      {data && (
        <>
          <Notice tone={data.doneThisMonth ? 'success' : 'info'}>
            {data.doneThisMonth ? s.doneThisMonth(formatDayMonth(new Date(data.doneThisMonth.createdAt))) : s.notThisMonth}
          </Notice>

          <Text variant="label" color="textMuted">
            {s.history}
          </Text>
          {data.items.length === 0 && <EmptyState icon="mic" message={s.empty} />}
          {data.items.map((item, i) => {
            const delta = i === 0 && first && first.id !== item.id ? metricsDelta(item.metrics, first.metrics) : null;
            return (
              <Card
                key={item.id}
                title={formatMonthYear(new Date(item.createdAt))}
                titleRight={
                  <IconButton
                    icon="more-vertical"
                    color="textMuted"
                    accessibilityLabel={strings.common.more}
                    onPress={() =>
                      openActionSheet([{ label: strings.common.delete, icon: 'trash-2', destructive: true, onPress: () => void remove(item) }])
                    }
                  />
                }
              >
                {item.metrics.words > 0 ? (
                  <StatTiles
                    stats={[
                      { value: String(item.metrics.wpm), label: s.wpm },
                      { value: String(item.metrics.unique), label: s.unique },
                      { value: String(item.metrics.words), label: s.words },
                      { value: `${item.metrics.variety}%`, label: s.variety },
                    ]}
                  />
                ) : (
                  <Text color="textMuted">{s.noTranscript}</Text>
                )}
                {delta && <Notice tone="success">{s.sinceFirst(delta.wpm, delta.unique)}</Notice>}
                <View style={styles.actions}>
                  {item.hasAudio && (
                    <Button
                      label={playingId === item.id && player.playing ? s.stopPlaying : s.play}
                      icon={playingId === item.id && player.playing ? 'square' : 'play-circle'}
                      variant="secondary"
                      onPress={() => togglePlay(item)}
                    />
                  )}
                  {item.transcript ? (
                    <Button
                      label={correcting === item.id ? s.correcting : s.correct}
                      icon="check-square"
                      variant="secondary"
                      loading={correcting === item.id}
                      onPress={() => void correct(item)}
                    />
                  ) : null}
                  <Button
                    label={item.transcript ? s.transcript : s.editTranscript}
                    icon="edit-3"
                    variant="ghost"
                    onPress={() => setEditing({ id: item.id, text: item.transcript })}
                  />
                </View>
              </Card>
            );
          })}
        </>
      )}

      <Sheet visible={editing != null} onClose={() => setEditing(null)} title={s.transcript} snapPoints={['80%']}>
        <TextField
          label={s.transcript}
          value={editing?.text ?? ''}
          onChangeText={(text) => setEditing((e) => (e ? { ...e, text } : e))}
          multiline
          autoCapitalize="sentences"
        />
        <Button label={s.saveTranscript} icon="check" size="main" onPress={() => void saveTranscript()} />
      </Sheet>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  actions: { gap: t.spacing.sm },
}));
