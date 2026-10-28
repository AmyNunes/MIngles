import { View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { WeekDay } from '@/features/today/useToday';
import { strings } from '@/i18n/strings';
import { weekdayInitial, weekdayShort } from '@/lib/dates';
import { makeStyles } from '@/theme';

const w = strings.today.week;

/** "Sua semana": um ponto por dia (ativo, sem atividade, futuro). Sem streak punitivo. */
export function WeekCard({ days }: { days: WeekDay[] }) {
  const styles = useStyles();
  const activeCount = days.filter((d) => d.state === 'active').length;

  return (
    <Card title={w.title}>
      <View style={styles.row}>
        {days.map((d) => {
          const label = d.state === 'active' ? w.active : d.state === 'future' ? w.future : w.inactive;
          return (
            <View
              key={d.key}
              style={styles.day}
              accessible
              accessibilityLabel={`${weekdayShort(d.weekday)}: ${label}`}
            >
              <Text variant="caption" color={d.state === 'today' ? 'primary' : 'textMuted'}>
                {weekdayInitial(d.weekday)}
              </Text>
              <View
                style={[
                  styles.dot,
                  d.state === 'active' && styles.active,
                  (d.state === 'inactive' || d.state === 'today') && styles.ring,
                  d.state === 'today' && styles.today,
                  d.state === 'future' && styles.future,
                ]}
              />
            </View>
          );
        })}
      </View>
      <Text variant="caption" color="textMuted">
        {w.summary(activeCount)}
      </Text>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: t.spacing.sm, minWidth: t.sizes.badge.sm },
  dot: { width: t.spacing.lg, height: t.spacing.lg, borderRadius: t.radii.full },
  active: { backgroundColor: t.colors.primary },
  ring: { borderWidth: 2, borderColor: t.colors.border },
  today: { borderColor: t.colors.primary },
  future: {
    width: t.spacing.sm,
    height: t.spacing.sm,
    marginVertical: (t.spacing.lg - t.spacing.sm) / 2,
    backgroundColor: t.colors.border,
  },
}));
