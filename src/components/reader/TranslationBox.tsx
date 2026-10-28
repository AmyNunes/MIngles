import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AIError, toAIError } from '@/ai/client';
import { cachedTranslation, translate } from '@/ai/functions/reader';
import { Button, Skeleton, Text } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { makeStyles, TINT, withAlpha } from '@/theme';

type State = { status: 'loading' } | { status: 'done'; text: string } | { status: 'error'; message: string };

/** Tradução de uma frase ou parágrafo, logo abaixo do texto (com cache). */
export function TranslationBox({ text }: { text: string }) {
  const styles = useStyles();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    translate(text)
      .then((t) => alive && setState({ status: 'done', text: t }))
      .catch(async (error: unknown) => {
        const cached = error instanceof AIError && error.kind === 'offline' ? await cachedTranslation(text) : null;
        if (!alive) return;
        setState(cached ? { status: 'done', text: cached } : { status: 'error', message: toAIError(error).messagePt });
      });
    return () => {
      alive = false;
    };
  }, [text, attempt]);

  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      {state.status === 'loading' && (
        <View style={styles.loading} accessibilityLabel={strings.reader.translating}>
          <Skeleton height={14} width="90%" />
          <Skeleton height={14} width="60%" />
        </View>
      )}
      {state.status === 'done' && <Text color="textMuted">{state.text}</Text>}
      {state.status === 'error' && (
        <>
          <Text variant="caption" color="textMuted">
            {state.message}
          </Text>
          <Button
            label={strings.common.retry}
            variant="ghost"
            icon="refresh-cw"
            onPress={() => {
              setState({ status: 'loading' });
              setAttempt((a) => a + 1);
            }}
          />
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  box: {
    marginVertical: t.spacing.sm,
    padding: t.spacing.md,
    borderLeftWidth: t.spacing.xs / 2,
    borderLeftColor: t.colors.primary,
    borderRadius: t.radii.sm,
    backgroundColor: withAlpha(t.colors.primary, TINT / 2),
    gap: t.spacing.xs,
  },
  loading: { gap: t.spacing.sm },
}));
