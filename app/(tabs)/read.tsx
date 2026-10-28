import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LibraryItemRow } from '@/components/reader/LibraryItemRow';
import {
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  Notice,
  ScreenHeader,
  Segmented,
  Skeleton,
  SwipeRow,
} from '@/components/ui';
import type { LibraryItem } from '@/features/reader/libraryService';
import { useLibrary } from '@/features/reader/useLibrary';
import { strings } from '@/i18n/strings';
import { openActionSheet } from '@/stores/actionSheetStore';
import { makeStyles, useTheme } from '@/theme';

const r = strings.read;

const FILTERS = [
  { value: 'reading', label: r.filterReading },
  { value: 'archived', label: r.filterArchived },
] as const;

export default function ReadScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const lib = useLibrary();
  const { state, reload, refresh, refreshing } = lib.loader;

  const openAddMenu = () =>
    openActionSheet([
      { label: r.paste, icon: 'clipboard', onPress: () => void lib.paste() },
      { label: r.write, icon: 'edit-3', onPress: lib.writeManually },
      { label: r.fromLink, icon: 'link', onPress: () => void lib.pasteLink() },
      { label: strings.photo.menu, icon: 'camera', onPress: () => void lib.fromPhoto() },
    ]);

  const openItemMenu = (item: LibraryItem) =>
    openActionSheet(
      [
        { label: item.archived ? r.unarchive : r.archive, icon: 'archive', onPress: () => void lib.setArchivedFor([item], !item.archived) },
        { label: strings.common.select, icon: 'check-square', onPress: () => lib.toggleSelected(item.id) },
        { label: r.delete, icon: 'trash-2', destructive: true, onPress: () => void lib.remove([item]) },
      ],
      item.title,
    );

  const header = (
    <View style={styles.header}>
      <ScreenHeader
        title={strings.tabs.read}
        right={
          lib.selecting ? (
            <IconButton icon="x" accessibilityLabel={strings.cardsList.exitSelection} onPress={lib.clearSelection} />
          ) : (
            <IconButton icon="plus" accessibilityLabel={r.addMenu} onPress={openAddMenu} />
          )
        }
      />
      <Button label={r.paste} icon="clipboard" size="main" onPress={() => void lib.paste()} />
      <Segmented
        accessibilityLabel={r.filterLabel}
        options={FILTERS}
        value={lib.archived ? 'archived' : 'reading'}
        onChange={(v) => lib.setArchived(v === 'archived')}
      />
      {lib.photoBusy && <Notice icon="camera">{r.photoBusy}</Notice>}
      {lib.queued > 0 && <Notice icon="wifi-off">{r.queueWaiting(lib.queued)}</Notice>}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {state.status === 'loading' && (
        <View style={styles.padded}>
          {header}
          <Skeleton height={96} radius="md" />
          <Skeleton height={96} radius="md" />
        </View>
      )}
      {state.status === 'error' && (
        <View style={styles.padded}>
          {header}
          <ErrorState onRetry={reload} />
        </View>
      )}
      {state.status === 'success' && (
        <FlashList
          data={lib.items}
          keyExtractor={(i) => i.id}
          ListHeaderComponent={header}
          ListHeaderComponentStyle={styles.listHeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[theme.colors.primary]} />}
          ListEmptyComponent={
            lib.archived ? (
              <EmptyState icon="archive" message={r.emptyArchived} />
            ) : (
              <EmptyState icon="book-open" message={r.empty} action={{ label: r.paste, onPress: () => void lib.paste() }} />
            )
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <SwipeRow
              enabled={!lib.selecting}
              onSwipeRight={{
                label: item.archived ? r.unarchive : r.archive,
                icon: 'archive',
                color: 'typeContext',
                onTrigger: () => void lib.setArchivedFor([item], !item.archived),
              }}
              onSwipeLeft={{ label: r.delete, icon: 'trash-2', color: 'rateAgain', onTrigger: () => void lib.remove([item]) }}
            >
              <LibraryItemRow
                item={item}
                selecting={lib.selecting}
                selected={lib.selected.has(item.id)}
                onPress={() => (lib.selecting ? lib.toggleSelected(item.id) : router.push(`/reader/${item.id}`))}
                onLongPress={() => lib.toggleSelected(item.id)}
                onMenu={() => openItemMenu(item)}
              />
            </SwipeRow>
          )}
        />
      )}
      {lib.selecting && (
        <View style={styles.selectionBar}>
          <Button
            label={lib.archived ? r.unarchive : r.archive}
            icon="archive"
            variant="secondary"
            onPress={() => void lib.setArchivedFor(lib.selectedItems, !lib.archived)}
          />
          <Button label={r.delete} icon="trash-2" variant="secondary" onPress={() => void lib.remove(lib.selectedItems)} />
        </View>
      )}
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  padded: { padding: t.spacing.screen, gap: t.spacing.lg },
  header: { gap: t.spacing.lg, paddingBottom: t.spacing.lg },
  listHeader: { paddingHorizontal: t.spacing.screen },
  separator: { height: 1, backgroundColor: t.colors.border },
  selectionBar: {
    flexDirection: 'row',
    gap: t.spacing.sm,
    padding: t.spacing.md,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
}));
