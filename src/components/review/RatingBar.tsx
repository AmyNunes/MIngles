import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { RATINGS, type RatingPreview, type StudyRating } from '@/srs/fsrs';
import { makeStyles, TINT, useTheme, withAlpha, type ColorTokens } from '@/theme';

export const RATING_COLORS: Record<StudyRating, keyof ColorTokens> = {
  again: 'rateAgain',
  hard: 'rateHard',
  good: 'rateGood',
  easy: 'rateEasy',
};

type Props = {
  preview: RatingPreview;
  onRate: (rating: StudyRating) => void;
  disabled?: boolean;
};

/**
 * 4 botões iguais, altura 56. "Bom" preenchido; os outros tonais (seção 7.4).
 * Texto escuro sobre as cores no tema claro, para passar no contraste AA.
 */
export function RatingBar({ preview, onRate, disabled }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const r = strings.review.ratings;

  return (
    <View style={styles.row}>
      {RATINGS.map((rating) => {
        const color = theme.colors[RATING_COLORS[rating]];
        const filled = rating === 'good';
        const fg = filled ? (theme.scheme === 'dark' ? 'onPrimary' : 'text') : 'text';
        return (
          <Pressable
            key={rating}
            disabled={disabled}
            onPress={() => onRate(rating)}
            accessibilityRole="button"
            accessibilityLabel={strings.review.rateHint(r[rating], preview[rating].interval)}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: filled ? color : withAlpha(color, TINT) },
              !filled && { borderColor: color },
              pressed && styles.pressed,
            ]}
          >
            <Text variant="label" color={fg} numberOfLines={1}>
              {r[rating]}
            </Text>
            <Text variant="caption" color={fg} numberOfLines={1}>
              {preview[rating].interval}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', gap: t.spacing.sm },
  button: {
    flex: 1,
    minHeight: t.sizes.buttonHeightMain,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: t.spacing.xs,
  },
  pressed: { opacity: t.opacity.pressed },
}));
