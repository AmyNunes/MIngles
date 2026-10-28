import { router, Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { DiffText } from '@/components/cards/DiffText';
import { Button, EmptyState, ErrorState, IconButton, Screen, Skeleton, SwipeRow, Text } from '@/components/ui';
import { listErrorsByCategory, setErrorsArchived, type ErrorRow } from '@/db/errorsRepo';
import { categoryLabel, SEVERITY_LABELS } from '@/features/errors/taxonomy';
import { strings } from '@/i18n/strings';
import { formatDayMonth } from '@/lib/dates';
import { useLoader } from '@/lib/useLoader';
import { openActionSheet } from '@/stores/actionSheetStore';
import { showSnackbar } from '@/stores/snackbarStore';
import { makeStyles } from '@/theme';

const e = strings.errorsList;

export default function ErrorCategoryScreen() {
  const styles = useStyles();
  const { category } = useLocalSearchParams<{ category: string }>();
  const { state, reload, refresh } = useLoader(() => listErrorsByCategory(category), category);
  const train = () => router.push(`/practice/quiz?category=${category}`);

  const archive = async (item: ErrorRow) => {
    await setErrorsArchived([item.id], true);
    refresh();
    showSnackbar(e.archived, {
      label: strings.common.undo,
      onPress: async () => {
        await setErrorsArchived([item.id], false);
        refresh();
      },
    });
  };

  return (
    <Screen
      edges={['bottom']}
      footer={<Button label={e.trainCategory} icon="target" size="main" onPress={train} />}
      contentStyle={styles.content}
    >
      <Stack.Screen options={{ title: categoryLabel(category) }} />
      {state.status === 'loading' && <Skeleton height={120} radius="lg" />}
      {state.status === 'error' && <ErrorState onRetry={reload} />}
      {state.status === 'success' && state.data.length === 0 && <EmptyState icon="check-circle" message={e.empty} />}
      {state.status === 'success' && state.data.length > 0 && (
        <View style={styles.list}>
          {state.data.map((item) => (
            <SwipeRow
              key={item.id}
              onSwipeRight={{ label: e.train, icon: 'target', color: 'typeProduction', onTrigger: train }}
              onSwipeLeft={{ label: e.archive, icon: 'archive', color: 'rateAgain', onTrigger: () => void archive(item) }}
            >
              <View style={styles.row}>
                <View style={styles.texts}>
                  <DiffText original={item.original} corrected={item.corrected} />
                  {item.explanationPt ? (
                    <Text variant="caption" color="textMuted">
                      {item.explanationPt}
                    </Text>
                  ) : null}
                  <Text variant="caption" color="textMuted">
                    {`${SEVERITY_LABELS[item.severity]} · ${formatDayMonth(new Date(item.createdAt))}`}
                  </Text>
                </View>
                <IconButton
                  icon="more-vertical"
                  color="textMuted"
                  accessibilityLabel={strings.common.more}
                  onPress={() =>
                    openActionSheet([
                      { label: e.train, icon: 'target', onPress: train },
                      { label: e.archive, icon: 'archive', onPress: () => void archive(item) },
                    ])
                  }
                />
              </View>
            </SwipeRow>
          ))}
        </View>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: { paddingHorizontal: 0 },
  list: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: t.colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    padding: t.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  texts: { flex: 1, gap: t.spacing.xs },
}));
