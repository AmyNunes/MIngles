import { View } from 'react-native';

import { DiffText } from '@/components/cards/DiffText';
import { Button, Notice, Skeleton, Text } from '@/components/ui';
import type { ThinkState } from '@/features/capture/useThink';
import { categoryLabel } from '@/features/errors/taxonomy';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

/** "Pense em inglês": o enunciado (aberto pela notificação). */
export function ThinkPrompt() {
  return <Notice icon="message-circle">{strings.capture.thinkPrompt}</Notice>;
}

/** Correção do "Pense em inglês", dentro da própria Captura. */
export function ThinkResult({ think }: { think: ThinkState }) {
  const styles = useStyles();
  const { state } = think;

  if (state.status === 'loading') {
    return (
      <View style={styles.block} accessibilityLabel={strings.journal.correcting}>
        <Skeleton height={20} width="80%" />
        <Skeleton height={20} width="60%" />
      </View>
    );
  }
  if (state.status === 'error') return <Notice tone="error">{state.message}</Notice>;
  if (state.status !== 'result') return null;

  const { correction } = state;
  const errors = correction.edits.filter((e) => e.severity === 'error').length;

  return (
    <View style={styles.block}>
      {correction.edits.length === 0 ? (
        <Notice tone="success">{strings.think.perfect}</Notice>
      ) : (
        <>
          <DiffText original={correction.original} corrected={correction.correctedText} variant="reading" />
          {correction.edits.map((e, i) => (
            <View key={`${e.original}-${i}`} style={styles.edit}>
              <Text variant="label">{`${categoryLabel(e.category)}: ${e.original} → ${e.corrected}`}</Text>
              {e.explanationPt ? (
                <Text variant="caption" color="textMuted">
                  {e.explanationPt}
                </Text>
              ) : null}
            </View>
          ))}
        </>
      )}
      {correction.naturalVersion && correction.naturalVersion !== correction.correctedText ? (
        <View style={styles.edit}>
          <Text variant="label" color="textMuted">
            {strings.think.natural}
          </Text>
          <Text style={styles.italic}>{correction.naturalVersion}</Text>
        </View>
      ) : null}
      {errors > 0 && !state.saved && (
        <Button label={strings.think.saveErrors(errors)} icon="bookmark" size="main" loading={think.saving} onPress={() => void think.saveErrors()} />
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  block: { gap: t.spacing.md },
  edit: { gap: t.spacing.xs },
  italic: { fontStyle: 'italic' },
}));
