import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Keyboard, View } from 'react-native';

import { Button, Card, ListGroup, ListRow, Screen, Skeleton, Text, TextField } from '@/components/ui';
import { MicButton } from '@/components/voice/MicButton';
import { useJournal } from '@/features/production/useJournal';
import { strings } from '@/i18n/strings';
import { formatShortDate, parseDateKey } from '@/lib/dates';
import { useSettings } from '@/stores/settingsStore';
import { makeStyles } from '@/theme';

const j = strings.journal;

export default function JournalScreen() {
  const styles = useStyles();
  const journal = useJournal();
  const accent = useSettings((s) => s.voice.accent);
  const [suggestion] = useState(() => j.suggestions[new Date().getDate() % j.suggestions.length]);

  return (
    <Screen
      edges={['bottom']}
      footer={
        <Button
          label={journal.correcting ? j.correcting : journal.correctionId ? j.correctAgain : j.correct}
          icon="check-circle"
          size="main"
          loading={journal.correcting}
          onPress={() => {
            Keyboard.dismiss();
            void journal.correct();
          }}
        />
      }
    >
      <Stack.Screen options={{ title: formatShortDate(parseDateKey(journal.day)) }} />
      {journal.loading ? (
        <Skeleton height={220} radius="lg" />
      ) : (
        <Card>
          <TextField
            label={j.title}
            value={journal.text}
            onChangeText={journal.setText}
            placeholder={journal.text ? j.placeholder : suggestion}
            multiline
            autoCapitalize="sentences"
            helper={j.editableUntil}
            editable={!journal.correcting}
          />
          <View style={styles.meta}>
            <Text variant="caption" color="textMuted" style={styles.flex}>
              {j.words(journal.words)}
            </Text>
            {!journal.correcting && (
              <MicButton
                lang={accent}
                continuous
                onText={(spoken) => journal.setText(journal.text.trim() ? `${journal.text.trim()} ${spoken}` : spoken)}
              />
            )}
            {journal.correctionId && (
              <Button
                label={strings.practice.seeCorrection}
                variant="ghost"
                icon="eye"
                onPress={() => router.push(`/practice/correction/${journal.correctionId}`)}
              />
            )}
          </View>
        </Card>
      )}

      {journal.history.length > 0 && (
        <ListGroup title={j.previous}>
          {journal.history.map((entry) => (
            <ListRow
              key={entry.id}
              icon="book"
              iconColor="typeCloze"
              title={formatShortDate(parseDateKey(entry.date))}
              subtitle={(entry.correctedText ?? entry.original).slice(0, 120)}
              onPress={entry.correctionId ? () => router.push(`/practice/correction/${entry.correctionId}`) : undefined}
            />
          ))}
        </ListGroup>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.md },
  flex: { flex: 1 },
}));
