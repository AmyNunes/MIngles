import { Gesture } from 'react-native-gesture-handler';
import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { StudyRating } from '@/srs/fsrs';
import { useTheme } from '@/theme';

type Options = {
  /** Gestos ligados em Configurações › Gestos. */
  enabled: boolean;
  /** Só avalia depois de virar. Antes, o card balança. */
  canRate: boolean;
  width: number;
  height: number;
  /** Fração da tela para avaliar (sensibilidade: 0,45 / 0,35 / 0,25). */
  threshold: number;
  leftHanded: boolean;
  onRate: (rating: StudyRating) => void;
  onBlocked: () => void;
  onCrossThreshold: () => void;
  onTap: () => void;
  onDoubleTap: () => void;
  onLongPress: () => void;
};

const MAX_TILT_DEG = 12;
const FLING_VELOCITY = 800;

/** Direção do arraste → avaliação (seção 6.2). Modo canhoto espelha esquerda/direita. */
export function ratingForDrag(x: number, y: number, leftHanded: boolean): StudyRating {
  'worklet';
  if (Math.abs(x) >= Math.abs(y)) {
    const right = x > 0;
    return right !== leftHanded ? 'good' : 'again';
  }
  return y < 0 ? 'easy' : 'hard';
}

/** 0 → 1 conforme o arraste se aproxima do limite. */
export function dragProgress(x: number, y: number, width: number, height: number, threshold: number): number {
  'worklet';
  if (width <= 0 || height <= 0) return 0;
  return Math.min(1, Math.max(Math.abs(x) / (width * threshold), Math.abs(y) / (height * threshold)));
}

export type SwipeState = { x: SharedValue<number>; y: SharedValue<number> };

/** Gestos do card da revisão: toque, duplo toque, segurar e arrastar para avaliar. */
export function useSwipeToRate(o: Options) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const crossed = useSharedValue(false);

  const pan = Gesture.Pan()
    .enabled(o.enabled)
    .minDistance(10)
    .onUpdate((e) => {
      if (!o.canRate) {
        x.set(e.translationX * 0.12);
        y.set(e.translationY * 0.12);
        return;
      }
      x.set(e.translationX);
      y.set(e.translationY);
      const over = dragProgress(e.translationX, e.translationY, o.width, o.height, o.threshold) >= 1;
      if (over !== crossed.get()) {
        crossed.set(over);
        if (over) scheduleOnRN(o.onCrossThreshold);
      }
    })
    .onEnd((e) => {
      crossed.set(false);
      if (!o.canRate) {
        const shake = { duration: theme.durations.micro / 2 };
        x.set(
          reduceMotion
            ? 0
            : withSequence(
                withTiming(-theme.spacing.sm, shake),
                withTiming(theme.spacing.sm, shake),
                withSpring(0, theme.springs.drag),
              ),
        );
        y.set(reduceMotion ? 0 : withSpring(0, theme.springs.drag));
        scheduleOnRN(o.onBlocked);
        return;
      }
      const tx = x.get();
      const ty = y.get();
      const p = dragProgress(tx, ty, o.width, o.height, o.threshold);
      const fast = Math.max(Math.abs(e.velocityX), Math.abs(e.velocityY)) > FLING_VELOCITY;
      if (p >= 1 || (fast && p > 0.2)) {
        const rating = ratingForDrag(tx, ty, o.leftHanded);
        if (reduceMotion) {
          x.set(0);
          y.set(0);
          scheduleOnRN(o.onRate, rating);
          return;
        }
        const horizontal = Math.abs(tx) >= Math.abs(ty);
        const toX = horizontal ? Math.sign(tx) * o.width * 1.4 : tx;
        const toY = horizontal ? ty : Math.sign(ty) * o.height * 1.4;
        x.set(withTiming(toX, { duration: theme.durations.transition }));
        y.set(
          withTiming(toY, { duration: theme.durations.transition }, (finished) => {
            if (finished) scheduleOnRN(o.onRate, rating);
          }),
        );
      } else {
        x.set(withSpring(0, theme.springs.drag));
        y.set(withSpring(0, theme.springs.drag));
      }
    });

  const singleTap = Gesture.Tap()
    .maxDuration(300)
    .onEnd((_e, success) => {
      if (success) scheduleOnRN(o.onTap);
    });
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((_e, success) => {
      if (success) scheduleOnRN(o.onDoubleTap);
    });
  const longPress = Gesture.LongPress()
    .minDuration(450)
    .onStart(() => {
      scheduleOnRN(o.onLongPress);
    });

  const gesture = Gesture.Race(pan, longPress, Gesture.Exclusive(doubleTap, singleTap));

  const cardStyle = useAnimatedStyle(() => {
    const tilt = reduceMotion ? 0 : Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, (x.get() / Math.max(1, o.width)) * MAX_TILT_DEG * 2));
    return { transform: [{ translateX: x.get() }, { translateY: y.get() }, { rotate: `${tilt}deg` }] };
  });

  return { gesture, cardStyle, drag: { x, y } as SwipeState };
}
