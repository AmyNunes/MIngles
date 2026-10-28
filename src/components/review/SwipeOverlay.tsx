import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { dragProgress, ratingForDrag, type SwipeState } from '@/gestures/useSwipeToRate';
import { strings } from '@/i18n/strings';
import { RATINGS, type RatingPreview, type StudyRating } from '@/srs/fsrs';
import { makeStyles, useTheme } from '@/theme';

import { RATING_COLORS } from './RatingBar';

type Props = {
  drag: SwipeState;
  preview: RatingPreview;
  width: number;
  height: number;
  threshold: number;
  leftHanded: boolean;
};

function Layer({ rating, label, color, ...p }: Props & { rating: StudyRating; label: string; color: string }) {
  const styles = useStyles();
  const style = useAnimatedStyle(() => {
    const x = p.drag.x.get();
    const y = p.drag.y.get();
    const active = (x !== 0 || y !== 0) && ratingForDrag(x, y, p.leftHanded) === rating;
    return { opacity: active ? dragProgress(x, y, p.width, p.height, p.threshold) * 0.92 : 0 };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.layer, { backgroundColor: color }, style]} pointerEvents="none">
      <Text variant="title" style={styles.label}>
        {label}
      </Text>
    </Animated.View>
  );
}

/**
 * Sobreposição na cor da avaliação durante o arraste: "Bom · 3 d",
 * com opacidade proporcional à distância (seção 6.2).
 */
export function SwipeOverlay(props: Props) {
  const theme = useTheme();
  return (
    <>
      {RATINGS.map((rating) => (
        <Layer
          key={rating}
          {...props}
          rating={rating}
          color={theme.colors[RATING_COLORS[rating]]}
          label={`${strings.review.ratings[rating]} · ${props.preview[rating].interval}`}
        />
      ))}
    </>
  );
}

const useStyles = makeStyles((t) => ({
  layer: { borderRadius: t.radii.lg, alignItems: 'center', justifyContent: 'center' },
  label: { color: t.scheme === 'dark' ? t.colors.onPrimary : t.colors.text },
}));
