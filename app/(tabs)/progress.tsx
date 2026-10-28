import { router } from 'expo-router';
import { RefreshControl } from 'react-native';

import { SettingsButton } from '@/components/navigation/SettingsButton';
import { AiSpendCard } from '@/components/progress/AiSpendCard';
import { AvoidanceCard } from '@/components/progress/AvoidanceCard';
import { NotebookCard } from '@/components/progress/NotebookCard';
import { ReviewsChart } from '@/components/progress/ReviewsChart';
import { StatTiles } from '@/components/progress/StatTiles';
import { WeeklyList } from '@/components/progress/WeeklyList';
import { ErrorState, ListGroup, ListRow, Screen, ScreenHeader, Skeleton } from '@/components/ui';
import { loadProgress } from '@/features/progress/progressService';
import { strings } from '@/i18n/strings';
import { useLoader } from '@/lib/useLoader';
import { useTheme } from '@/theme';

const p = strings.progress;

export default function ProgressScreen() {
  const theme = useTheme();
  const { state, reload, refresh, refreshing } = useLoader(loadProgress);

  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[theme.colors.primary]} />}
    >
      <ScreenHeader title={strings.tabs.progress} right={<SettingsButton />} />
      {state.status === 'loading' && (
        <>
          <Skeleton height={180} radius="lg" />
          <Skeleton height={220} radius="lg" />
        </>
      )}
      {state.status === 'error' && <ErrorState onRetry={reload} />}
      {state.status === 'success' && (
        <>
          <StatTiles
            stats={[
              { value: String(state.data.dueToday), label: p.stats.dueToday },
              {
                value: state.data.retention == null ? p.stats.noData : `${Math.round(state.data.retention * 100)}%`,
                label: p.stats.retention,
              },
              { value: String(state.data.learned), label: p.stats.learned },
              { value: String(state.data.activeDaysMonth), label: p.stats.activeDays },
            ]}
          />
          <ReviewsChart data={state.data.chart} />
          <NotebookCard items={state.data.notebook} />
          <AvoidanceCard words={state.data.wordsWritten} stored={state.data.avoidance} onUpdated={refresh} />
          <WeeklyList weeks={state.data.weeks} />
          <AiSpendCard {...state.data.spend} />
          <ListGroup>
            <ListRow icon="layers" title={p.myCards} onPress={() => router.push('/cards')} />
          </ListGroup>
        </>
      )}
    </Screen>
  );
}
