import { View } from 'react-native';

import { Card, Chip, Segmented, Stepper, Text, TimeField, WeekdayPicker } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { weekdayShort } from '@/lib/dates';
import type { NotificationSettings, NotificationType } from '@/notifications/types';
import { makeStyles } from '@/theme';

const d = strings.notifications.detail;
const c = strings.notifications.center;

type Props = {
  type: NotificationType;
  settings: NotificationSettings;
  /** Atualiza o bloco do tipo. */
  onChange: (patch: Record<string, unknown>) => void;
};

const LEADS = [
  { value: 'dayBefore', label: c.leadLabels.dayBefore },
  { value: 'threeHours', label: c.leadLabels.threeHours },
  { value: 'both', label: c.leadLabels.both },
] as const;

/** Configurações específicas de cada tipo (tabela da seção 9.3). */
export function TypeSettingsFields({ type, settings: s, onChange }: Props) {
  const styles = useStyles();

  if (type === 'review' || type === 'challenge' || type === 'journal') {
    const cfg = s[type];
    return (
      <Card>
        <TimeField label={d.time} value={cfg.time} onChange={(time) => onChange({ time })} />
        <Text variant="label" color="textMuted">
          {d.days}
        </Text>
        <WeekdayPicker value={cfg.days} onChange={(days) => onChange({ days })} />
        {type === 'review' && (
          <View style={styles.inline}>
            <Text style={styles.flex}>{d.minCards}</Text>
            <Stepper
              accessibilityLabel={d.minCards}
              value={s.review.minCards}
              min={1}
              max={200}
              onChange={(minCards) => onChange({ minCards })}
            />
          </View>
        )}
      </Card>
    );
  }

  if (type === 'think') {
    return (
      <Card>
        <Text variant="label" color="textMuted">
          {d.window}
        </Text>
        <View style={styles.inline}>
          <TimeField label={d.windowStart} value={s.think.windowStart} onChange={(windowStart) => onChange({ windowStart })} />
          <TimeField label={d.windowEnd} value={s.think.windowEnd} onChange={(windowEnd) => onChange({ windowEnd })} />
        </View>
        <View style={styles.inline}>
          <Text style={styles.flex}>{d.perDay}</Text>
          <Stepper accessibilityLabel={d.perDay} value={s.think.perDay} min={1} max={5} onChange={(perDay) => onChange({ perDay })} />
        </View>
        <Text variant="label" color="textMuted">
          {d.days}
        </Text>
        <WeekdayPicker value={s.think.days} onChange={(days) => onChange({ days })} />
      </Card>
    );
  }

  if (type === 'weekly') {
    return (
      <Card>
        <Text variant="label" color="textMuted">
          {d.weekday}
        </Text>
        <View style={styles.chips}>
          {[1, 2, 3, 4, 5, 6, 0].map((w) => (
            <Chip key={w} label={weekdayShort(w)} selected={s.weekly.weekday === w} onPress={() => onChange({ weekday: w })} />
          ))}
        </View>
        <TimeField label={d.time} value={s.weekly.time} onChange={(time) => onChange({ time })} />
      </Card>
    );
  }

  if (type === 'rehearsal') {
    return (
      <Card title={d.lead}>
        <Segmented accessibilityLabel={d.lead} options={LEADS} value={s.rehearsal.lead} onChange={(lead) => onChange({ lead })} />
      </Card>
    );
  }

  return (
    <Card>
      <View style={styles.inline}>
        <Text style={styles.flex}>{d.afterDays}</Text>
        <Stepper
          accessibilityLabel={d.afterDays}
          value={s.comeback.afterDays}
          min={1}
          max={14}
          onChange={(afterDays) => onChange({ afterDays })}
        />
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
}));
