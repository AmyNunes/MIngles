import { View } from 'react-native';

import { IconButton, Text } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

type Props = {
  title: string;
  playing: boolean;
  onBack: () => void;
  onPlay: () => void;
  onMenu: () => void;
};

/** Voltar · título · ▶ (ouvir) · ⋯ */
export function ReaderTopBar({ title, playing, onBack, onPlay, onMenu }: Props) {
  const styles = useStyles();
  const r = strings.reader;
  return (
    <View style={styles.row}>
      <IconButton icon="arrow-left" accessibilityLabel={r.back} onPress={onBack} />
      <Text variant="heading" numberOfLines={1} align="center" style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <IconButton icon={playing ? 'square' : 'play'} accessibilityLabel={playing ? r.stop : r.listen} onPress={onPlay} color={playing ? 'primary' : 'text'} />
      <IconButton icon="more-horizontal" accessibilityLabel={strings.common.more} onPress={onMenu} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.spacing.xs },
  title: { flex: 1 },
}));
