import { Stack } from 'expo-router';

import { ListGroup, ListRow, Screen, Stepper, Text, Toggle } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { formatTimeOfDay } from '@/lib/dates';
import { useSettings } from '@/stores/settingsStore';

const s = strings.settings.study;

export default function StudySettingsScreen() {
  const study = useSettings((st) => st.study);
  const update = useSettings((st) => st.update);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: s.title }} />

      <ListGroup title={s.limits}>
        <ListRow
          title={s.newPerDay}
          right={
            <Stepper
              accessibilityLabel={s.newPerDay}
              value={study.newPerDay}
              min={0}
              max={100}
              step={5}
              onChange={(newPerDay) => update('study', { newPerDay })}
            />
          }
        />
        <ListRow
          title={s.maxReviews}
          right={
            <Stepper
              accessibilityLabel={s.maxReviews}
              value={study.maxReviewsPerDay}
              min={10}
              max={1000}
              step={10}
              onChange={(maxReviewsPerDay) => update('study', { maxReviewsPerDay })}
            />
          }
        />
        <ListRow
          title={s.retention}
          subtitle={s.retentionHint}
          right={
            <Stepper
              accessibilityLabel={s.retention}
              value={study.retention}
              min={0.8}
              max={0.97}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(retention) => update('study', { retention })}
            />
          }
        />
        <ListRow
          title={s.minimalDay}
          subtitle={s.minimalDayHint}
          right={
            <Stepper
              accessibilityLabel={s.minimalDay}
              value={study.minimalDaySize}
              min={1}
              max={20}
              onChange={(minimalDaySize) => update('study', { minimalDaySize })}
            />
          }
        />
        <ListRow
          title={s.rollover}
          subtitle={s.rolloverHint}
          right={
            <Stepper
              accessibilityLabel={s.rollover}
              value={study.rolloverHour}
              min={0}
              max={6}
              format={(h) => formatTimeOfDay(h * 60)}
              onChange={(rolloverHour) => update('study', { rolloverHour })}
            />
          }
        />
      </ListGroup>

      <ListGroup title={s.cards}>
        <ListRow
          title={s.autoCloze}
          subtitle={s.autoClozeHint}
          right={
            <Toggle
              accessibilityLabel={s.autoCloze}
              value={study.autoCloze}
              onValueChange={(autoCloze) => update('study', { autoCloze })}
            />
          }
        />
        <ListRow
          title={s.productionFromContext}
          subtitle={s.productionFromContextHint}
          right={
            <Toggle
              accessibilityLabel={s.productionFromContext}
              value={study.productionFromContext}
              onValueChange={(productionFromContext) => update('study', { productionFromContext })}
            />
          }
        />
      </ListGroup>
      <Text variant="caption" color="textMuted" align="center">
        {strings.common.autoSaved}
      </Text>
    </Screen>
  );
}
