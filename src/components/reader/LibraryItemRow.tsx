import { Pressable, View } from 'react-native';

import { Icon, IconButton, IconBadge, ProgressBar, Text, type IconName } from '@/components/ui';
import type { SourceKind } from '@/db/sourcesRepo';
import type { LibraryItem } from '@/features/reader/libraryService';
import { strings } from '@/i18n/strings';
import { formatDayMonth } from '@/lib/dates';
import { makeStyles, useTheme } from '@/theme';

const r = strings.read;

export const KIND_ICONS: Record<SourceKind, IconName> = {
  paste: 'clipboard',
  manual: 'edit-3',
  share: 'share-2',
  photo: 'camera',
};

type Props = {
  item: LibraryItem;
  selecting: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onMenu: () => void;
};

/** Item da biblioteca: título, origem, data, % de palavras conhecidas e progresso. */
export function LibraryItemRow({ item, selecting, selected, onPress, onLongPress, onMenu }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const known = Math.round(item.knownRatio * 100);
  const read = Math.round(item.progress * 100);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole={selecting ? 'checkbox' : 'button'}
      accessibilityState={selecting ? { checked: selected } : undefined}
      accessibilityLabel={`${item.title}. ${r.known(known)}. ${r.progress(read)}`}
      style={({ pressed }) => [styles.row, (pressed || selected) && styles.pressed]}
    >
      {selecting ? (
        <View style={[styles.box, selected && styles.boxOn]}>
          {selected && <Icon name="check" color="onPrimary" size={theme.sizes.iconSmall} />}
        </View>
      ) : (
        <IconBadge icon={KIND_ICONS[item.kind]} color="typeContext" />
      )}
      <View style={styles.texts}>
        <Text variant="heading" numberOfLines={2}>
          {item.title}
        </Text>
        <Text variant="caption" color="textMuted">
          {`${r.kinds[item.kind]} · ${formatDayMonth(new Date(item.createdAt))} · ${r.progress(read)}`}
        </Text>
        <View style={styles.knownRow}>
          <View style={styles.bar}>
            <ProgressBar progress={item.knownRatio} color="rateGood" accessibilityLabel={r.known(known)} />
          </View>
          <Text variant="caption" color="textMuted">
            {`${known}%`}
          </Text>
        </View>
      </View>
      {!selecting && <IconButton icon="more-vertical" color="textMuted" accessibilityLabel={strings.common.more} onPress={onMenu} />}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    backgroundColor: t.colors.surface,
  },
  pressed: { backgroundColor: t.colors.surfaceAlt },
  texts: { flex: 1, gap: t.spacing.xs },
  knownRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  bar: { flex: 1 },
  box: {
    width: t.sizes.badge.md,
    height: t.sizes.badge.md,
    borderRadius: t.radii.full,
    borderWidth: 2,
    borderColor: t.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
}));
