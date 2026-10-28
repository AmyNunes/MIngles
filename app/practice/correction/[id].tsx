import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { DiffText } from '@/components/cards/DiffText';
import { ChangeSheet } from '@/components/correction/ChangeSheet';
import { LearnedList } from '@/components/correction/LearnedList';
import { Button, Card, EmptyState, ErrorState, IconButton, Notice, Screen, Segmented, Skeleton, Text } from '@/components/ui';
import { useCorrection } from '@/features/production/useCorrection';
import { useNextSessionStep } from '@/features/today/useNextSessionStep';
import { strings } from '@/i18n/strings';
import { speak } from '@/lib/speech';
import { makeStyles } from '@/theme';

const c = strings.correction;
type Tab = 'corrections' | 'natural' | 'learned';

const TABS = [
  { value: 'corrections', label: c.tabs.corrections },
  { value: 'natural', label: c.tabs.natural },
  { value: 'learned', label: c.tabs.learned },
] as const;

export default function CorrectionScreen() {
  const styles = useStyles();
  const { id, tab: initialTab } = useLocalSearchParams<{ id: string; tab?: Tab }>();
  const state = useCorrection(id);
  const [tab, setTab] = useState<Tab>(initialTab ?? 'corrections');
  const [openEdit, setOpenEdit] = useState<number | null>(null);
  const origin = state.correction?.origin;
  const next = useNextSessionStep(state.saved && (origin === 'challenge' || origin === 'journal'), origin);
  const title = <Stack.Screen options={{ title: c.title }} />;

  if (state.status !== 'ready' || !state.correction) {
    return (
      <Screen edges={[]}>
        {title}
        {state.status === 'loading' && <Skeleton height={240} radius="lg" />}
        {state.status === 'error' && <ErrorState onRetry={state.retry} />}
        {state.status === 'notFound' && <EmptyState icon="file" message={c.notFound} />}
      </Screen>
    );
  }

  const correction = state.correction;
  const editIndexOf = (changeNumber: number) => state.editOfChange[changeNumber - 1] ?? null;
  const perfect = correction.edits.length === 0;

  const footer = state.saved ? (
    <View style={styles.footer}>
      {next && <Button label={c.nextStep(next.label)} icon="arrow-right" size="main" onPress={next.onPress} />}
      <Button label={c.backToToday} variant={next ? 'ghost' : 'primary'} size={next ? 'regular' : 'main'} onPress={() => router.dismissTo('/')} />
    </View>
  ) : (
    <Button
      label={c.save(state.cardsToCreate)}
      icon="bookmark"
      size="main"
      loading={state.saving}
      onPress={() => void state.save()}
      disabled={perfect}
    />
  );

  return (
    <Screen edges={['bottom']} footer={perfect && !state.saved ? undefined : footer}>
      {title}
      <Segmented accessibilityLabel={c.title} options={TABS} value={tab} onChange={setTab} />

      {tab === 'corrections' && (
        <>
          {perfect ? (
            <Notice tone="success">{c.perfect}</Notice>
          ) : (
            <Text variant="caption" color="textMuted">
              {c.tapHint}
            </Text>
          )}
          <Card>
            <DiffText
              original={correction.original}
              corrected={correction.correctedText}
              variant="reading"
              numbered
              dimmed={state.disputedChanges}
              onPressChange={(n) => setOpenEdit(editIndexOf(n))}
              onLongPressChange={(n) => {
                const i = editIndexOf(n);
                if (i != null) state.toggleDispute(i);
              }}
            />
          </Card>
          {state.saved && <Notice tone="success">{c.alreadySaved}</Notice>}
        </>
      )}

      {tab === 'natural' && (
        <Card>
          {correction.naturalVersion ? (
            <>
              <Text variant="reading">{correction.naturalVersion}</Text>
              <IconButton icon="volume-2" accessibilityLabel={c.listen} onPress={() => speak(correction.naturalVersion)} />
            </>
          ) : (
            <Text color="textMuted">{c.noNatural}</Text>
          )}
        </Card>
      )}

      {tab === 'learned' && <LearnedList edits={correction.edits} disputed={state.decisions.map((d) => d.disputed)} />}

      <ChangeSheet
        edit={openEdit != null ? correction.edits[openEdit] : null}
        decision={openEdit != null ? state.decisions[openEdit] : null}
        readOnly={state.saved}
        onClose={() => setOpenEdit(null)}
        onToggleSave={() => openEdit != null && state.toggleSaveCard(openEdit)}
        onToggleDispute={() => openEdit != null && state.toggleDispute(openEdit)}
      />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  footer: { gap: t.spacing.sm },
}));
