import { View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { Edit } from '@/ai/schemas/production';
import { categoryLabel } from '@/features/errors/taxonomy';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

type Props = { edits: Edit[]; disputed: boolean[] };

/** "O que aprendi": alterações agrupadas por categoria. */
export function LearnedList({ edits, disputed }: Props) {
  const styles = useStyles();
  const groups = new Map<string, Edit[]>();
  edits.forEach((e, i) => {
    if (disputed[i]) return;
    groups.set(e.category, [...(groups.get(e.category) ?? []), e]);
  });

  if (!groups.size) {
    return (
      <Text color="textMuted" align="center">
        {strings.correction.learnedEmpty}
      </Text>
    );
  }

  return (
    <>
      {[...groups.entries()]
        .sort((a, b) => b[1].length - a[1].length)
        .map(([category, list]) => (
          <Card key={category} title={`${categoryLabel(category)} · ${strings.practice.times(list.length)}`}>
            {list.map((e, i) => (
              <View key={`${e.original}-${i}`} style={styles.item}>
                <Text>
                  <Text style={styles.before}>{e.original || '—'}</Text>
                  {'  →  '}
                  <Text variant="heading">{e.corrected || '—'}</Text>
                </Text>
                {e.explanationPt ? (
                  <Text variant="caption" color="textMuted">
                    {e.explanationPt}
                  </Text>
                ) : null}
              </View>
            ))}
          </Card>
        ))}
    </>
  );
}

const useStyles = makeStyles((t) => ({
  item: { gap: t.spacing.xs },
  before: { textDecorationLine: 'line-through', color: t.colors.textMuted },
}));
