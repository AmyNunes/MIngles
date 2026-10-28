import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { strings } from '@/i18n/strings';
import { addDays, formatTime, formatWeekdayDayMonth } from '@/lib/dates';
import { makeStyles } from '@/theme';

import { Button } from './Button';
import { Sheet } from './Sheet';
import { Stepper } from './Stepper';
import { Text } from './Text';

type Props = {
  label: string;
  value: Date;
  onChange: (value: Date) => void;
  /** Quantos dias à frente dá para escolher. */
  maxDays?: number;
};

const pad = (n: number) => String(n).padStart(2, '0');
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Data e hora de um evento: dia (hoje, amanhã, qui 23/10…) + hora e minuto. */
export function DateTimeField({ label, value, onChange, maxDays = 90 }: Props) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ days: 0, h: 9, m: 0 });
  const today = startOfDay(new Date());
  const r = strings.rehearsals;
  const t = strings.notifications.timePicker;

  const dayLabel = (days: number) =>
    days === 0 ? r.today : days === 1 ? r.tomorrow : formatWeekdayDayMonth(addDays(today, days));

  const openPicker = () => {
    const days = Math.max(0, Math.round((startOfDay(value).getTime() - today.getTime()) / 86_400_000));
    setDraft({ days, h: value.getHours(), m: value.getMinutes() - (value.getMinutes() % 5) });
    setOpen(true);
  };

  const build = () => {
    const d = addDays(today, draft.days);
    d.setHours(draft.h, draft.m, 0, 0);
    return d;
  };

  return (
    <>
      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatWeekdayDayMonth(value)} ${formatTime(value)}`}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
      >
        <Text variant="caption" color="textMuted">
          {label}
        </Text>
        <Text variant="heading">{`${formatWeekdayDayMonth(value)} · ${formatTime(value)}`}</Text>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label} snapPoints={['65%']}>
        <View style={styles.row}>
          <Text variant="label" style={styles.label}>
            {label}
          </Text>
          <Stepper
            accessibilityLabel={label}
            value={draft.days}
            min={0}
            max={maxDays}
            format={dayLabel}
            onChange={(days) => setDraft((d) => ({ ...d, days }))}
          />
        </View>
        <View style={styles.row}>
          <Text variant="label" style={styles.label}>
            {t.hour}
          </Text>
          <Stepper accessibilityLabel={t.hour} value={draft.h} min={0} max={23} format={pad} onChange={(h) => setDraft((d) => ({ ...d, h }))} />
        </View>
        <View style={styles.row}>
          <Text variant="label" style={styles.label}>
            {t.minute}
          </Text>
          <Stepper accessibilityLabel={t.minute} value={draft.m} min={0} max={55} step={5} format={pad} onChange={(m) => setDraft((d) => ({ ...d, m }))} />
        </View>
        <Button
          label={strings.common.done}
          icon="check"
          size="main"
          onPress={() => {
            onChange(build());
            setOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  field: {
    minHeight: t.sizes.listRowHeight,
    justifyContent: 'center',
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radii.md,
    backgroundColor: t.colors.surfaceAlt,
  },
  pressed: { opacity: t.opacity.pressed },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.md },
  label: { flex: 1 },
}));
