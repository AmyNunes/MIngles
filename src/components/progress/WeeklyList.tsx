import { router } from 'expo-router';

import { ListGroup, ListRow, Text } from '@/components/ui';
import type { WeeklySummary } from '@/db/progressRepo';
import { strings } from '@/i18n/strings';
import { addDays, formatDayMonth, parseDateKey } from '@/lib/dates';

const p = strings.progress;

type Props = { weeks: { weekStart: string; summary: WeeklySummary | null }[] };

/** Lista de resumos por semana. */
export function WeeklyList({ weeks }: Props) {
  if (!weeks.length) {
    return (
      <Text variant="caption" color="textMuted">
        {p.weeklyEmpty}
      </Text>
    );
  }
  return (
    <ListGroup title={p.weekly}>
      {weeks.map(({ weekStart, summary }) => {
        const start = parseDateKey(weekStart);
        return (
          <ListRow
            key={weekStart}
            icon="calendar"
            iconColor="rateGood"
            title={p.weekLabel(formatDayMonth(start), formatDayMonth(addDays(start, 6)))}
            subtitle={summary ? summary.summaryPt : p.notSummarized}
            value={summary ? p.weekMeta(summary.stats.reviews) : undefined}
            onPress={() => router.push(`/progress/weekly/${weekStart}`)}
          />
        );
      })}
    </ListGroup>
  );
}
