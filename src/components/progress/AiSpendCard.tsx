import { View } from 'react-native';

import { Card, ProgressBar, Text } from '@/components/ui';
import type { UsageTotals } from '@/db/aiUsageRepo';
import { strings } from '@/i18n/strings';
import { formatUsd } from '@/lib/format';
import { makeStyles } from '@/theme';

const p = strings.progress;

type Props = {
  cost: number;
  calls: number;
  limit: number | null;
  byFeature: (UsageTotals & { feature: string })[];
};

const featureLabel = (f: string) => (f in p.features ? p.features[f as keyof typeof p.features] : f);

/** Gasto de IA: este mês, por função, e o limite configurado (seção 8.6 / 10.7). */
export function AiSpendCard({ cost, calls, limit, byFeature }: Props) {
  const styles = useStyles();
  const ratio = limit ? cost / limit : 0;
  const meterColor = ratio >= 1 ? 'rateAgain' : ratio >= 0.8 ? 'rateHard' : 'primary';

  return (
    <Card title={p.spend}>
      <Text variant="heading">{limit ? p.spendOfLimit(formatUsd(cost), formatUsd(limit)) : p.spendMonth(formatUsd(cost))}</Text>
      {limit != null && <ProgressBar progress={ratio} color={meterColor} accessibilityLabel={p.spendOfLimit(formatUsd(cost), formatUsd(limit))} />}
      <Text variant="caption" color="textMuted">
        {p.spendCalls(calls)}
      </Text>
      {cost === 0 && calls > 0 && (
        <Text variant="caption" color="textMuted">
          {p.spendNoPrice}
        </Text>
      )}
      {byFeature.map((f) => (
        <View key={f.feature} style={styles.row}>
          <Text style={styles.flex}>{featureLabel(f.feature)}</Text>
          <Text variant="caption" color="textMuted">{`${p.spendCalls(f.calls)} · ${formatUsd(f.cost ?? 0)}`}</Text>
        </View>
      ))}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  flex: { flex: 1 },
}));
