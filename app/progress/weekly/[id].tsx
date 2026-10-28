import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AIError, toAIError } from '@/ai/client';
import { StatTiles } from '@/components/progress/StatTiles';
import { Button, Card, Chip, EmptyState, ErrorState, Notice, Screen, Skeleton, Text } from '@/components/ui';
import type { WeeklySummary } from '@/db/progressRepo';
import { categoryLabel } from '@/features/errors/taxonomy';
import { computeWeekStats, currentWeekStart, getOrCreateWeeklySummary } from '@/features/progress/progressService';
import type { WeekStats } from '@/features/progress/stats';
import { strings } from '@/i18n/strings';
import { addDays, formatDayMonth, parseDateKey } from '@/lib/dates';
import { makeStyles } from '@/theme';

const w = strings.weekly;

type State =
  | { status: 'loading' }
  | { status: 'ready'; summary: WeeklySummary }
  | { status: 'statsOnly'; stats: WeekStats; message: string; needsAi: boolean };

export default function WeeklyScreen() {
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const weekStart = id === 'latest' ? currentWeekStart() : id;
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refresh, setRefresh] = useState(0);
  const start = parseDateKey(weekStart);
  const title = `${formatDayMonth(start)} – ${formatDayMonth(addDays(start, 6))}`;

  useEffect(() => {
    let alive = true;
    getOrCreateWeeklySummary(weekStart, refresh > 0)
      .then((summary) => {
        if (alive && summary) setState({ status: 'ready', summary });
      })
      .catch(async (e: unknown) => {
        const stats = await computeWeekStats(weekStart);
        if (alive) {
          setState({
            status: 'statsOnly',
            stats,
            message: toAIError(e).messagePt,
            needsAi: e instanceof AIError && e.kind === 'notConfigured',
          });
        }
      });
    return () => {
      alive = false;
    };
  }, [weekStart, refresh]);

  const stats = state.status === 'ready' ? state.summary.stats : state.status === 'statsOnly' ? state.stats : null;

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title }} />
      {state.status === 'loading' && (
        <>
          <Text color="textMuted">{w.generating}</Text>
          <Skeleton height={160} radius="lg" />
        </>
      )}
      {stats && stats.reviews === 0 && stats.wordsWritten === 0 && state.status !== 'ready' && <EmptyState icon="calendar" message={w.empty} />}
      {stats && (
        <StatTiles
          stats={[
            { value: String(stats.reviews), label: w.reviews },
            { value: `${Math.round(stats.accuracy * 100)}%`, label: w.accuracy },
            { value: String(stats.wordsWritten), label: w.words },
            { value: String(stats.activeDays), label: w.activeDays },
          ]}
        />
      )}
      {state.status === 'ready' && (
        <>
          <Card title={w.title}>
            <Text variant="reading">{state.summary.summaryPt}</Text>
          </Card>
          {state.summary.focusNextWeekPt ? (
            <Notice icon="target">
              <Text variant="label">{w.focus}</Text>
              <Text>{state.summary.focusNextWeekPt}</Text>
            </Notice>
          ) : null}
        </>
      )}
      {state.status === 'statsOnly' &&
        (state.needsAi ? (
          <Notice action={<Button label={strings.ai.configure} variant="secondary" icon="cpu" onPress={() => router.push('/settings/ai')} />}>
            {state.message}
          </Notice>
        ) : (
          <ErrorState message={state.message} onRetry={() => setRefresh((r) => r + 1)} />
        ))}
      {stats && (
        <Card title={w.topErrors}>
          {stats.topCategories.length ? (
            <View style={styles.chips}>
              {stats.topCategories.map((c) => (
                <Chip
                  key={c.category}
                  label={`${categoryLabel(c.category)} · ${strings.practice.times(c.n)}`}
                  onPress={() => router.push(`/errors/${c.category}`)}
                />
              ))}
            </View>
          ) : (
            <Text color="textMuted">{w.noErrors}</Text>
          )}
        </Card>
      )}
      {state.status === 'ready' && (
        <Button
          label={w.refresh}
          icon="refresh-cw"
          variant="ghost"
          onPress={() => {
            setState({ status: 'loading' });
            setRefresh((r) => r + 1);
          }}
        />
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
}));
