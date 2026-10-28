import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { formatShortDate, parseDateKey, weekdayInitial } from '@/lib/dates';
import { makeStyles, useTheme, withAlpha } from '@/theme';

type Props = { data: { day: string; reviews: number }[] };

const p = strings.progress;
const DIM = 0.35;

/**
 * Revisões dos últimos 14 dias: colunas feitas com Views (seção 8.6).
 * Uma série só (sem legenda), barras finas com topo arredondado, rótulos só no
 * maior dia e em hoje; tocar numa coluna mostra o valor dela.
 */
export function ReviewsChart({ data }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.reviews), 0);
  const total = data.reduce((s, d) => s + d.reviews, 0);
  const maxIndex = data.findIndex((d) => d.reviews === max);
  const today = data.length - 1;
  const h = theme.sizes.chartHeight;

  return (
    <Card title={p.chartTitle}>
      {total === 0 ? (
        <Text color="textMuted">{p.chartEmpty}</Text>
      ) : (
        <View accessible={false}>
          <Text variant="caption" color="textMuted" accessibilityRole="summary">
            {p.chartSummary(total, max)}
          </Text>
          <View style={[styles.plot, { height: h + theme.spacing.xl }]}>
            {data.map((d, i) => {
              const barHeight = d.reviews > 0 ? Math.max(theme.spacing.xs, (d.reviews / Math.max(1, max)) * h) : 0;
              const showValue = d.reviews > 0 && (i === selected || (selected == null && (i === maxIndex || i === today)));
              const date = parseDateKey(d.day);
              return (
                <Pressable
                  key={d.day}
                  onPress={() => setSelected(selected === i ? null : i)}
                  accessibilityRole="button"
                  accessibilityLabel={p.chartBar(formatShortDate(date), d.reviews)}
                  style={styles.column}
                >
                  {showValue && (
                    <Text variant="caption" color="textMuted" numberOfLines={1}>
                      {String(d.reviews)}
                    </Text>
                  )}
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor:
                          selected == null || selected === i ? theme.colors.primary : withAlpha(theme.colors.primary, DIM),
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
          <View style={styles.baseline} />
          <View style={styles.labels}>
            {data.map((d, i) => (
              <Text
                key={d.day}
                variant="caption"
                color={i === today ? 'primary' : 'textMuted'}
                style={styles.label}
                importantForAccessibility="no"
              >
                {weekdayInitial(parseDateKey(d.day).getDay())}
              </Text>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  plot: { flexDirection: 'row', alignItems: 'flex-end' },
  column: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: t.spacing.xs / 2,
    // 2 dp de "superfície" entre colunas vizinhas
    marginHorizontal: 1,
  },
  bar: {
    width: '78%',
    maxWidth: t.sizes.barMaxWidth,
    borderTopLeftRadius: t.radii.sm / 2,
    borderTopRightRadius: t.radii.sm / 2,
  },
  baseline: { height: 1, backgroundColor: t.colors.border },
  labels: { flexDirection: 'row', paddingTop: t.spacing.xs },
  label: { flex: 1, textAlign: 'center' },
}));
