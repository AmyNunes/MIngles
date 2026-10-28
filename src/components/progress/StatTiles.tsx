import { View } from 'react-native';

import { Text } from '@/components/ui';
import { makeStyles } from '@/theme';

export type Stat = { value: string; label: string };

/** Linha de números (blocos de valor): grande em cima, rótulo embaixo. */
export function StatTiles({ stats }: { stats: Stat[] }) {
  const styles = useStyles();
  return (
    <View style={styles.grid}>
      {stats.map((s) => (
        <View key={s.label} style={styles.tile} accessible accessibilityLabel={`${s.value} ${s.label}`}>
          <Text variant="display">{s.value}</Text>
          <Text variant="caption" color="textMuted">
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.md },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: t.spacing.xs / 2,
    padding: t.spacing.lg,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
}));
