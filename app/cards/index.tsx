import { FlashList } from '@shopify/flash-list';
import { router, Stack } from 'expo-router';
import { RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CardFilters } from '@/components/cards/CardFilters';
import { CardListItem } from '@/components/cards/CardListItem';
import {
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  SearchField,
  Skeleton,
  SwipeRow,
  Text,
} from '@/components/ui';
import { useCardsList } from '@/features/cards/useCardsList';
import { useSettings } from '@/stores/settingsStore';
import { strings } from '@/i18n/strings';
import { endOfStudyDay } from '@/lib/dates';
import { openActionSheet } from '@/stores/actionSheetStore';
import { makeStyles, useTheme } from '@/theme';

const l = strings.cardsList;

export default function CardsScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const list = useCardsList();
  const rollover = useSettings((s) => s.study.rolloverHour);
  const endOfToday = endOfStudyDay(new Date(), rollover).toISOString();
  const { state, reload, refresh, refreshing } = list.loader;

  const openMenu = (id: string) => {
    const card = list.cards.find((c) => c.id === id);
    if (!card) return;
    openActionSheet(
      [
        { label: strings.common.edit, icon: 'edit-2', onPress: () => router.push(`/cards/${card.id}`) },
        {
          label: card.suspended ? l.unsuspend : l.suspend,
          icon: card.suspended ? 'play-circle' : 'pause-circle',
          onPress: () => void list.suspend([card], !card.suspended),
        },
        { label: strings.common.select, icon: 'check-square', onPress: () => list.toggleSelected(card.id) },
        { label: l.delete, icon: 'trash-2', destructive: true, onPress: () => void list.remove([card]) },
      ],
      card.note.term,
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: list.selecting ? l.selected(list.selected.size) : l.title,
          headerRight: () =>
            list.selecting ? (
              <IconButton icon="x" accessibilityLabel={l.exitSelection} onPress={list.clearSelection} />
            ) : (
              <IconButton icon="plus" accessibilityLabel={l.newCard} onPress={() => router.push('/cards/new')} />
            ),
        }}
      />

      <View style={styles.top}>
        <View style={styles.search}>
          <SearchField value={list.search} onChangeText={list.setSearch} placeholder={l.search} />
        </View>
        <CardFilters
          types={list.types}
          states={list.states}
          onToggleType={list.toggleType}
          onToggleState={list.toggleState}
        />
      </View>

      {state.status === 'loading' && (
        <View style={styles.padded}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={88} radius="md" />
          ))}
        </View>
      )}
      {state.status === 'error' && <ErrorState onRetry={reload} />}
      {state.status === 'success' && (
        <FlashList
          data={list.cards}
          keyExtractor={(c) => c.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[theme.colors.primary]} />
          }
          ListHeaderComponent={
            list.cards.length ? (
              <Text variant="caption" color="textMuted" style={styles.count}>
                {l.count(list.cards.length)}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="layers"
              message={list.search || list.types.length || list.states.length ? l.noResults : l.empty}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <SwipeRow
              enabled={!list.selecting}
              onSwipeRight={{
                label: item.suspended ? l.unsuspend : l.suspend,
                icon: item.suspended ? 'play-circle' : 'pause-circle',
                color: 'rateHard',
                onTrigger: () => void list.suspend([item], !item.suspended),
              }}
              onSwipeLeft={{ label: l.delete, icon: 'trash-2', color: 'rateAgain', onTrigger: () => void list.remove([item]) }}
            >
              <CardListItem
                card={item}
                endOfToday={endOfToday}
                selecting={list.selecting}
                selected={list.selected.has(item.id)}
                onPress={() => (list.selecting ? list.toggleSelected(item.id) : router.push(`/cards/${item.id}`))}
                onLongPress={() => list.toggleSelected(item.id)}
                onMenu={() => openMenu(item.id)}
              />
            </SwipeRow>
          )}
        />
      )}

      {list.selecting && (
        <View style={styles.selectionBar}>
          <Button label={l.suspend} icon="pause-circle" variant="secondary" onPress={() => void list.suspend(list.selectedCards, true)} />
          <Button label={l.unsuspend} icon="play-circle" variant="secondary" onPress={() => void list.suspend(list.selectedCards, false)} />
          <Button label={l.delete} icon="trash-2" variant="secondary" onPress={() => void list.remove(list.selectedCards)} />
        </View>
      )}
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  top: { gap: t.spacing.sm, paddingBottom: t.spacing.md },
  search: { paddingHorizontal: t.spacing.screen },
  padded: { padding: t.spacing.screen, gap: t.spacing.md },
  count: { paddingHorizontal: t.spacing.screen, paddingBottom: t.spacing.sm },
  separator: { height: 1, backgroundColor: t.colors.border },
  selectionBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: t.spacing.sm,
    padding: t.spacing.md,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
}));
