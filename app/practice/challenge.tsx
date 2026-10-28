import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Keyboard, View } from 'react-native';

import { Button, Card, Chip, EmptyState, ErrorState, Notice, Screen, Skeleton, Text, TextField } from '@/components/ui';
import { useChallenge, type ChallengeMode } from '@/features/production/useChallenge';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const ch = strings.challenge;

/** ?micro=1 → micro-desafio; ?custom={prompt, items} → desafio sob medida; senão, o do dia. */
function parseMode(micro?: string, custom?: string): ChallengeMode {
  if (micro === '1') return { kind: 'micro' };
  if (custom) {
    try {
      const parsed = JSON.parse(custom) as { prompt?: unknown; items?: unknown };
      if (typeof parsed.prompt === 'string' && Array.isArray(parsed.items)) {
        return { kind: 'custom', prompt: parsed.prompt, items: parsed.items.filter((i): i is string => typeof i === 'string') };
      }
    } catch {
      // parâmetro inválido: cai no desafio do dia
    }
  }
  return { kind: 'daily' };
}

export default function ChallengeScreen() {
  const styles = useStyles();
  const { micro, custom } = useLocalSearchParams<{ micro?: string; custom?: string }>();
  const isMicro = micro === '1';
  const state = useChallenge(parseMode(micro, custom));
  const [showExample, setShowExample] = useState(false);
  const title = <Stack.Screen options={{ title: isMicro ? ch.microTitle : ch.title }} />;

  if (state.status === 'loading') {
    return (
      <Screen edges={[]}>
        {title}
        <Text color="textMuted">{ch.generating}</Text>
        <Skeleton height={140} radius="lg" />
        <Skeleton height={180} radius="lg" />
      </Screen>
    );
  }
  if (state.status === 'needsAi') {
    return (
      <Screen edges={[]}>
        {title}
        <EmptyState icon="cpu" message={ch.needsAi} action={{ label: strings.ai.configure, onPress: () => router.push('/settings/ai') }} />
      </Screen>
    );
  }
  if (state.status === 'error') {
    return (
      <Screen edges={[]}>
        {title}
        <ErrorState message={state.error} onRetry={state.retry} />
      </Screen>
    );
  }

  const done = Boolean(state.challenge?.completedAt);

  return (
    <Screen
      edges={['bottom']}
      footer={
        <Button
          label={state.correcting ? strings.journal.correcting : strings.journal.correct}
          icon="check-circle"
          size="main"
          loading={state.correcting}
          disabled={!state.text.trim()}
          onPress={() => {
            Keyboard.dismiss();
            void state.correct();
          }}
        />
      }
    >
      {title}
      {done && (
        <Notice
          tone="success"
          action={
            state.challenge?.correctionId ? (
              <Button
                label={strings.practice.seeCorrection}
                variant="secondary"
                icon="eye"
                onPress={() => router.push(`/practice/correction/${state.challenge?.correctionId}`)}
              />
            ) : undefined
          }
        >
          {ch.done}
        </Notice>
      )}

      <Card>
        <Text variant="heading">{state.promptPt}</Text>
        {state.items.length > 0 && (
          <View style={styles.items}>
            <Text variant="label" color="textMuted">
              {ch.required}
            </Text>
            <View style={styles.chips}>
              {state.items.map((item, i) => {
                const check = state.checks[i];
                return (
                  <Chip
                    key={item.text}
                    label={item.text}
                    icon={check == null ? 'info' : undefined}
                    selected={check === true}
                    accessibilityLabel={`${item.text}: ${check == null ? ch.checkedByAi : check ? ch.used : ch.notUsed}`}
                  />
                );
              })}
            </View>
            {state.checks.some((c) => c == null) && (
              <Text variant="caption" color="textMuted">
                {ch.checkedByAi}
              </Text>
            )}
          </View>
        )}
      </Card>

      <Card>
        <TextField
          label={strings.review.yourAnswer}
          value={state.text}
          onChangeText={state.setText}
          placeholder={ch.placeholder}
          multiline
          autoCapitalize="sentences"
          editable={!state.correcting}
        />
        <Text variant="caption" color="textMuted">
          {strings.journal.words(state.words)}
        </Text>
      </Card>

      {done && state.challenge?.exampleAnswer ? (
        showExample ? (
          <Card title={ch.exampleTitle}>
            <Text variant="reading">{state.challenge.exampleAnswer}</Text>
          </Card>
        ) : (
          <Button label={ch.example} variant="ghost" icon="eye" onPress={() => setShowExample(true)} />
        )
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  items: { gap: t.spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
}));
