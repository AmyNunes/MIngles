import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { CardPreview } from '@/components/cards/CardPreview';
import { NoteFields } from '@/components/cards/NoteFields';
import { Button, Card, EmptyState, ErrorState, Screen, Segmented, Skeleton, Text } from '@/components/ui';
import type { NoteKind } from '@/features/cards/model';
import { useNoteEditor } from '@/features/cards/useNoteEditor';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const e = strings.editor;

const KIND_OPTIONS = [
  { value: 'term', label: e.kinds.term },
  { value: 'production', label: e.kinds.production },
] as const;

export default function CardEditorScreen() {
  const styles = useStyles();
  const { id, kind } = useLocalSearchParams<{ id: string; kind?: NoteKind }>();
  const editor = useNoteEditor(id, kind === 'production' ? 'production' : 'term');

  const title = <Stack.Screen options={{ title: editor.isNew ? e.titleNew : e.titleEdit }} />;

  if (editor.status === 'loading') {
    return (
      <Screen edges={[]}>
        {title}
        <Skeleton height={340} radius="lg" />
        <Skeleton height={200} radius="lg" />
      </Screen>
    );
  }
  if (editor.status === 'notFound') {
    return (
      <Screen edges={[]}>
        {title}
        <EmptyState icon="search" message={e.notFound} />
      </Screen>
    );
  }
  if (editor.status === 'error') {
    return (
      <Screen edges={[]}>
        {title}
        <ErrorState onRetry={editor.retry} />
      </Screen>
    );
  }

  return (
    <Screen
      edges={['bottom']}
      footer={
        <Button label={strings.common.save} icon="check" size="main" onPress={editor.save} loading={editor.saving} />
      }
    >
      {title}
      {editor.isNew && (
        <Segmented accessibilityLabel={e.kind} options={KIND_OPTIONS} value={editor.kind as 'term' | 'production'} onChange={editor.changeKind} />
      )}

      {editor.previewType && <CardPreview content={editor.content} type={editor.previewType} />}

      <Card>
        <NoteFields
          kind={editor.kind}
          fields={editor.fields}
          onChange={editor.setField}
          register={editor.register}
          onRegisterChange={editor.setRegister}
        />
        {editor.kind !== 'error' && (
          <Button
            label={editor.filling ? e.filling : e.fillWithAi}
            icon="zap"
            variant="secondary"
            loading={editor.filling}
            onPress={editor.fillWithAi}
          />
        )}
        {!editor.valid && (
          <Text variant="caption" color="textMuted">
            {e.required}
          </Text>
        )}
      </Card>

      {!editor.isNew && (
        <View style={styles.footer}>
          {editor.cardTypes.length > 0 && (
            <Text variant="caption" color="textMuted" align="center">
              {e.cardsOfNote(editor.cardTypes.map((t) => strings.cards.types[t]).join(' + '))}
            </Text>
          )}
          <Button label={e.deleteNote} icon="trash-2" variant="ghost" onPress={editor.remove} />
        </View>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  footer: { gap: t.spacing.sm },
}));
