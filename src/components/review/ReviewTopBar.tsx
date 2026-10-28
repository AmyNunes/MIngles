import { View } from 'react-native';

import { IconButton, ProgressBar, Text } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

type Props = {
  done: number;
  total: number;
  onExit: () => void;
  onMenu: () => void;
};

/** ✕  ━━━━━━━──────  12/30  ⋯ */
export function ReviewTopBar({ done, total, onExit, onMenu }: Props) {
  const styles = useStyles();
  const r = strings.review;

  return (
    <View style={styles.row}>
      <IconButton icon="x" accessibilityLabel={r.exit} onPress={onExit} />
      <View style={styles.progress}>
        <ProgressBar progress={total ? done / total : 0} accessibilityLabel={r.progressLabel(done, total)} />
      </View>
      <Text variant="label" color="textMuted" style={styles.counter}>
        {r.counter(done, total)}
      </Text>
      <IconButton icon="more-horizontal" accessibilityLabel={strings.common.more} onPress={onMenu} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs, paddingHorizontal: t.spacing.sm },
  progress: { flex: 1, paddingHorizontal: t.spacing.sm },
  counter: { minWidth: t.sizes.touchTarget, textAlign: 'center' },
}));
