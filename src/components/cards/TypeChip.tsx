import { View } from 'react-native';

import { Text } from '@/components/ui';
import type { CardType } from '@/features/cards/model';
import { strings } from '@/i18n/strings';
import { makeStyles, TINT, useTheme, withAlpha, type ColorTokens } from '@/theme';

export const TYPE_COLORS: Record<CardType, keyof ColorTokens> = {
  context: 'typeContext',
  production: 'typeProduction',
  cloze: 'typeCloze',
  error: 'typeError',
};

/** Chip do tipo do card: fundo suave + bolinha na cor do tipo + rótulo (cor nunca sozinha). */
export function TypeChip({ type }: { type: CardType }) {
  const theme = useTheme();
  const styles = useStyles();
  const color = theme.colors[TYPE_COLORS[type]];

  return (
    <View style={[styles.chip, { backgroundColor: withAlpha(color, TINT) }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text variant="caption" style={styles.label}>
        {strings.cards.types[type]}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: t.spacing.sm - t.spacing.xs / 2,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radii.sm,
  },
  dot: { width: t.spacing.sm, height: t.spacing.sm, borderRadius: t.radii.full },
  label: { fontWeight: t.typography.label.fontWeight },
}));
