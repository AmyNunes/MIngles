import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AIError, toAIError } from '@/ai/client';
import { rehearsalPrep } from '@/ai/functions/rehearsal';
import { SpeakButton } from '@/components/cards/CardFaces';
import { Button, Card, EmptyState, ErrorState, Notice, Screen, Skeleton, Text } from '@/components/ui';
import type { NewNote } from '@/db/notesRepo';
import { getRehearsal, updateRehearsal, type Rehearsal } from '@/db/rehearsalsRepo';
import { normalizeLemma } from '@/features/cards/lemma';
import { saveNotesInteractive } from '@/features/cards/saveInteractive';
import { strings } from '@/i18n/strings';
import { formatDayMonth, formatTime, formatWeekdayDayMonth } from '@/lib/dates';
import { speak } from '@/lib/speech';
import { makeStyles } from '@/theme';

const r = strings.rehearsals;

type State = { status: 'loading' } | { status: 'ready'; item: Rehearsal } | { status: 'notFound' } | { status: 'error'; message: string; needsAi: boolean };

export default function RehearsalScreen() {
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const item = await getRehearsal(id);
      if (!item) return alive && setState({ status: 'notFound' });
      if (item.prep && attempt === 0) return alive && setState({ status: 'ready', item });
      const prep = await rehearsalPrep(item);
      await updateRehearsal(id, { prep });
      if (alive) setState({ status: 'ready', item: { ...item, prep } });
    })().catch((e: unknown) => {
      if (alive) setState({ status: 'error', message: toAIError(e).messagePt, needsAi: e instanceof AIError && e.kind === 'notConfigured' });
    });
    return () => {
      alive = false;
    };
  }, [id, attempt]);

  const title = <Stack.Screen options={{ title: state.status === 'ready' ? state.item.title : r.title }} />;

  if (state.status === 'loading') {
    return (
      <Screen edges={[]}>
        {title}
        <Text color="textMuted">{r.preparing}</Text>
        <Skeleton height={200} radius="lg" />
      </Screen>
    );
  }
  if (state.status === 'notFound') {
    return (
      <Screen edges={[]}>
        {title}
        <EmptyState icon="users" message={r.notFound} />
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
          <ErrorState message={state.message} onRetry={() => setAttempt((a) => a + 1)} />
        )}
      </Screen>
    );
  }

  const { item } = state;
  const prep = item.prep;
  const at = new Date(item.eventAt);

  const saveVocab = async () => {
    if (!prep) return;
    setSaving(true);
    try {
      const notes: NewNote[] = prep.vocab.map((v) => ({
        kind: 'production',
        term: v.pt || v.en,
        lemma: normalizeLemma(v.en),
        data: { pt: v.pt || v.en, en: v.en, register: 'neutral', notePt: v.note, alternatives: [] },
        sourceId: null,
        sourceLabel: r.sourceLabel(item.title),
      }));
      await saveNotesInteractive(notes);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      edges={['bottom']}
      footer={
        <Button label={r.roleplay} icon="message-circle" size="main" onPress={() => router.push({ pathname: '/practice/conversation', params: { rehearsal: item.id } })} />
      }
    >
      {title}
      <Text color="textMuted">{`${formatWeekdayDayMonth(at)} · ${formatTime(at)}${item.description ? ` · ${item.description}` : ''}`}</Text>
      {item.rehearsedAt && <Notice tone="success">{r.rehearsedAt(formatDayMonth(new Date(item.rehearsedAt)))}</Notice>}

      {prep && (
        <>
          <Card title={r.keyPhrases}>
            {prep.keyPhrases.map((phrase) => (
              <View key={phrase} style={styles.phrase}>
                <Text variant="heading" style={styles.flex}>
                  {phrase}
                </Text>
                <SpeakButton onPress={() => speak(phrase)} />
              </View>
            ))}
          </Card>

          <Card title={r.vocab}>
            {prep.vocab.map((v) => (
              <View key={v.en} style={styles.vocab}>
                <Text variant="label">{`${v.en} — ${v.pt}`}</Text>
                {v.note ? (
                  <Text variant="caption" color="textMuted">
                    {v.note}
                  </Text>
                ) : null}
              </View>
            ))}
            <Button label={r.saveVocab(prep.vocab.length)} icon="bookmark" variant="secondary" loading={saving} onPress={() => void saveVocab()} />
          </Card>

          <Text variant="caption" color="textMuted">
            {r.roleplayHint}
          </Text>
          <Button
            label={r.regenerate}
            icon="refresh-cw"
            variant="ghost"
            onPress={() => {
              setState({ status: 'loading' });
              setAttempt((a) => a + 1);
            }}
          />
        </>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  phrase: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  vocab: { gap: t.spacing.xs / 2 },
}));
