import { RefreshControl } from 'react-native';

import { SettingsButton } from '@/components/navigation/SettingsButton';
import { ErrorOfWeekCard } from '@/components/today/ErrorOfWeekCard';
import { FirstUseGuide } from '@/components/today/FirstUseGuide';
import { NextRehearsalCard } from '@/components/today/NextRehearsalCard';
import { SessionCard } from '@/components/today/SessionCard';
import { WeekCard } from '@/components/today/WeekCard';
import { ErrorState, Notice, Screen, ScreenHeader, Skeleton } from '@/components/ui';
import { getGreeting } from '@/features/today/useGreeting';
import { useToday } from '@/features/today/useToday';
import { strings } from '@/i18n/strings';
import { useTheme } from '@/theme';

export default function TodayScreen() {
  const theme = useTheme();
  const { greeting, date } = getGreeting(new Date());
  const { state, reload, refresh, refreshing } = useToday();

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          colors={[theme.colors.primary]}
          progressBackgroundColor={theme.colors.surface}
        />
      }
    >
      <ScreenHeader eyebrow={date} title={greeting} right={<SettingsButton />} />

      {state.status === 'loading' && (
        <>
          <Skeleton height={260} radius="lg" />
          <Skeleton height={120} radius="lg" />
        </>
      )}
      {state.status === 'error' && <ErrorState onRetry={reload} />}

      {state.status === 'success' && (
        <>
          {state.data.returnMode && (
            <Notice icon="coffee">{strings.today.returnBanner(state.data.returnCount)}</Notice>
          )}
          {state.data.firstUse ? (
            <FirstUseGuide {...state.data.firstUse} />
          ) : (
            <SessionCard steps={state.data.steps} />
          )}
          {state.data.nextRehearsal && <NextRehearsalCard item={state.data.nextRehearsal} />}
          <WeekCard days={state.data.week} />
          {state.data.errorOfWeek && <ErrorOfWeekCard {...state.data.errorOfWeek} />}
        </>
      )}
    </Screen>
  );
}
