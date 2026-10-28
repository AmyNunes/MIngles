import type { ReactNode } from 'react';
import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@/lib/haptics';
import { makeStyles, useTheme, type ColorTokens } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type SwipeAction = {
  label: string;
  icon: IconName;
  color: keyof ColorTokens;
  onTrigger: () => void;
};

type Props = {
  children: ReactNode;
  /** Deslizar → (ação secundária: arquivar, suspender, treinar). */
  onSwipeRight?: SwipeAction;
  /** Deslizar ← (excluir). */
  onSwipeLeft?: SwipeAction;
  enabled?: boolean;
};

const THRESHOLD = 0.35;

/**
 * Linha de lista com ações reveladas ao deslizar (seção 6.4).
 * `activeOffsetX` + `failOffsetY` para não brigar com a rolagem vertical.
 */
export function SwipeRow({ children, onSwipeRight, onSwipeLeft, enabled = true }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const crossed = useSharedValue(false);

  const trigger = (direction: 'left' | 'right') => {
    haptics.medium();
    (direction === 'right' ? onSwipeRight : onSwipeLeft)?.onTrigger();
  };
  const tick = () => haptics.light();

  const pan = Gesture.Pan()
    .enabled(enabled && width > 0)
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      const allowed =
        (e.translationX > 0 && onSwipeRight != null) || (e.translationX < 0 && onSwipeLeft != null);
      x.set(allowed ? e.translationX : 0);
      const over = Math.abs(e.translationX) > width * THRESHOLD;
      if (over !== crossed.get()) {
        crossed.set(over);
        if (over) scheduleOnRN(tick);
      }
    })
    .onEnd(() => {
      const tx = x.get();
      if (Math.abs(tx) > width * THRESHOLD) {
        const direction = tx > 0 ? 'right' : 'left';
        x.set(withTiming(Math.sign(tx) * width, { duration: theme.durations.transition }, () => {
          scheduleOnRN(trigger, direction);
          x.set(withTiming(0, { duration: theme.durations.micro }));
        }));
      } else {
        x.set(withSpring(0, theme.springs.drag));
      }
      crossed.set(false);
    });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const rightBg = useAnimatedStyle(() => ({ opacity: x.get() > 0 ? 1 : 0 }));
  const leftBg = useAnimatedStyle(() => ({ opacity: x.get() < 0 ? 1 : 0 }));

  const background = (action: SwipeAction, side: 'left' | 'right') => (
    <Animated.View
      style={[
        styles.bg,
        side === 'left' ? styles.bgStart : styles.bgEnd,
        { backgroundColor: theme.colors[action.color] },
        side === 'left' ? rightBg : leftBg,
      ]}
      importantForAccessibility="no-hide-descendants"
    >
      <Icon name={action.icon} color="onPrimary" />
      <Text variant="label" color="onPrimary">
        {action.label}
      </Text>
    </Animated.View>
  );

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {onSwipeRight && background(onSwipeRight, 'left')}
      {onSwipeLeft && background(onSwipeLeft, 'right')}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.row, rowStyle]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { backgroundColor: t.colors.surface },
  bg: {
    ...{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.xl,
  },
  bgStart: { justifyContent: 'flex-start' },
  bgEnd: { justifyContent: 'flex-end' },
}));
