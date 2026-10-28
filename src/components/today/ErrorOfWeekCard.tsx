import { router } from 'expo-router';
import { View } from 'react-native';

import { DiffText } from '@/components/cards/DiffText';
import { Button, Card, IconBadge, Text } from '@/components/ui';
import type { ErrorRow } from '@/db/errorsRepo';
import { categoryLabel } from '@/features/errors/taxonomy';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const e = strings.errorOfWeek;

type Props = { category: string; count: number; example: ErrorRow | null };

/** "Erro da semana": a categoria mais frequente, com um exemplo e [Treinar] (seção 8.1). */
export function ErrorOfWeekCard({ category, count, example }: Props) {
  const styles = useStyles();
  return (
    <Card title={e.title}>
      <View style={styles.row}>
        <IconBadge icon="alert-circle" color="rateAgain" />
        <View style={styles.texts}>
          <Text variant="heading">{`${categoryLabel(category)} (${e.times(count)})`}</Text>
          {example && <DiffText original={example.original} corrected={example.corrected} />}
        </View>
      </View>
      <Button label={e.train} icon="target" variant="secondary" onPress={() => router.push(`/practice/quiz?category=${category}`)} />
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  texts: { flex: 1, gap: t.spacing.xs },
}));
