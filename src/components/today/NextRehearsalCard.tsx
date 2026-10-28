import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, IconBadge, Text } from '@/components/ui';
import type { Rehearsal } from '@/db/rehearsalsRepo';
import { strings } from '@/i18n/strings';
import { formatTime, formatWeekdayDayMonth } from '@/lib/dates';
import { makeStyles } from '@/theme';

const r = strings.rehearsals;

/** "Próximo ensaio": a situação mais próxima ainda não ensaiada, com [Ensaiar]. */
export function NextRehearsalCard({ item }: { item: Rehearsal }) {
  const styles = useStyles();
  const at = new Date(item.eventAt);
  return (
    <Card title={r.nextTitle}>
      <View style={styles.row}>
        <IconBadge icon="users" color="typeError" />
        <View style={styles.texts}>
          <Text variant="heading">{item.title}</Text>
          <Text variant="caption" color="textMuted">{`${formatWeekdayDayMonth(at)} · ${formatTime(at)}`}</Text>
        </View>
      </View>
      <Button label={r.rehearse} icon="message-circle" variant="secondary" onPress={() => router.push(`/practice/rehearsals/${item.id}`)} />
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  texts: { flex: 1, gap: t.spacing.xs },
}));
