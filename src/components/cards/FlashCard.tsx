import { useEffect, type ReactNode } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/theme';

type Props = {
  flipped: boolean;
  front: ReactNode;
  back: ReactNode;
  height: number;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

const PERSPECTIVE = 1200;

/**
 * O flashcard: superfície, raio 24, sombra suave.
 * Virar = rotação 3D no eixo Y em 280 ms; com "reduzir movimento", fade de 150 ms (seção 7.3).
 */
export function FlashCard({ flipped, front, back, height, style, accessibilityLabel }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(flipped ? 1 : 0);

  useEffect(() => {
    progress.set(
      withTiming(flipped ? 1 : 0, {
        duration: reduceMotion ? theme.durations.micro : theme.durations.flip,
      }),
    );
  }, [flipped, reduceMotion, progress, theme]);

  const frontStyle = useAnimatedStyle(() => {
    const p = progress.get();
    if (reduceMotion) return { opacity: 1 - p };
    return {
      opacity: p < 0.5 ? 1 : 0,
      transform: [{ perspective: PERSPECTIVE }, { rotateY: `${interpolate(p, [0, 1], [0, 180])}deg` }],
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const p = progress.get();
    if (reduceMotion) return { opacity: p };
    return {
      opacity: p >= 0.5 ? 1 : 0,
      transform: [{ perspective: PERSPECTIVE }, { rotateY: `${interpolate(p, [0, 1], [-180, 0])}deg` }],
    };
  });

  return (
    <Animated.View
      style={[styles.card, { height }, style]}
      accessible={accessibilityLabel != null}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, frontStyle]}
        pointerEvents={flipped ? 'none' : 'auto'}
        importantForAccessibility={flipped ? 'no-hide-descendants' : 'auto'}
      >
        {front}
      </Animated.View>
      <Animated.View
        style={[StyleSheet.absoluteFill, backStyle]}
        pointerEvents={flipped ? 'auto' : 'none'}
        importantForAccessibility={flipped ? 'auto' : 'no-hide-descendants'}
      >
        {back}
      </Animated.View>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    elevation: t.elevation.card,
    shadowColor: t.colors.scrim,
  },
}));
