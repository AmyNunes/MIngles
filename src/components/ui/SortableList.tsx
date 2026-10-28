import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@/lib/haptics';
import { makeStyles, useTheme } from '@/theme';

import { Icon } from './Icon';

type Positions = Record<string, number>;

type Props<T> = {
  data: T[];
  keyOf: (item: T) => string;
  rowHeight: number;
  /** `handle` = a alça ≡ que deve aparecer na linha. */
  renderItem: (item: T, handle: ReactNode) => ReactNode;
  onReorder: (keys: string[]) => void;
  handleLabel: (item: T) => string;
};

const toPositions = (keys: string[]): Positions => Object.fromEntries(keys.map((k, i) => [k, i]));

function Row({
  id,
  index,
  positions,
  count,
  rowHeight,
  onDrop,
  render,
  label,
}: {
  id: string;
  /** Posição inicial (ler o shared value durante o render gera aviso do Reanimated). */
  index: number;
  positions: SharedValue<Positions>;
  count: number;
  rowHeight: number;
  onDrop: (p: Positions) => void;
  render: (handle: ReactNode) => ReactNode;
  label: string;
}) {
  const theme = useTheme();
  const styles = useStyles();
  const top = useSharedValue(index * rowHeight);
  const dragging = useSharedValue(false);
  const startTop = useSharedValue(0);

  useAnimatedReaction(
    () => positions.get()[id],
    (pos) => {
      if (!dragging.get() && pos != null) top.set(withTiming(pos * rowHeight, { duration: theme.durations.transition }));
    },
  );

  const pan = Gesture.Pan()
    .activateAfterLongPress(200)
    .onStart(() => {
      dragging.set(true);
      startTop.set(top.get());
      scheduleOnRN(haptics.light);
    })
    .onUpdate((e) => {
      const y = Math.max(0, Math.min((count - 1) * rowHeight, startTop.get() + e.translationY));
      top.set(y);
      const next = Math.round(y / rowHeight);
      const current = positions.get();
      const from = current[id];
      if (next !== from) {
        const swapped: Positions = { ...current };
        for (const key of Object.keys(current)) if (current[key] === next) swapped[key] = from;
        swapped[id] = next;
        positions.set(swapped);
      }
    })
    .onEnd(() => {
      const pos = positions.get()[id];
      top.set(withTiming(pos * rowHeight, { duration: theme.durations.micro }));
      dragging.set(false);
      scheduleOnRN(onDrop, positions.get());
    });

  const style = useAnimatedStyle(() => ({
    top: top.get(),
    zIndex: dragging.get() ? 2 : 1,
    elevation: dragging.get() ? theme.elevation.card : 0,
  }));

  const handle = (
    <GestureDetector gesture={pan}>
      <View style={styles.handle} accessible accessibilityRole="adjustable" accessibilityLabel={label}>
        <Icon name="menu" color="textMuted" />
      </View>
    </GestureDetector>
  );

  return <Animated.View style={[styles.row, { height: rowHeight }, style]}>{render(handle)}</Animated.View>;
}

/** Lista reordenável arrastando pela alça ≡ (prioridade das notificações). */
export function SortableList<T>({ data, keyOf, rowHeight, renderItem, onReorder, handleLabel }: Props<T>) {
  const keys = data.map(keyOf);
  const positions = useSharedValue<Positions>(toPositions(keys));
  const joined = keys.join('|');

  useEffect(() => {
    positions.set(toPositions(joined.split('|')));
  }, [joined, positions]);

  const onDrop = (p: Positions) => {
    const order = Object.keys(p).sort((a, b) => p[a] - p[b]);
    if (order.join('|') !== joined) onReorder(order);
  };

  return (
    <View style={{ height: data.length * rowHeight }}>
      {data.map((item, index) => (
        <Row
          key={keyOf(item)}
          id={keyOf(item)}
          index={index}
          positions={positions}
          count={data.length}
          rowHeight={rowHeight}
          onDrop={onDrop}
          render={(handle) => renderItem(item, handle)}
          label={handleLabel(item)}
        />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { position: 'absolute', left: 0, right: 0, backgroundColor: t.colors.surface },
  handle: {
    width: t.sizes.touchTarget,
    height: t.sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
