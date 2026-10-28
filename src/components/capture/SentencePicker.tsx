import { Pressable, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { selectionText, type Token } from '@/lib/tokenize';
import { makeStyles } from '@/theme';

type Props = {
  tokens: Token[];
  /** Índices (em `tokens`) do início e do fim da seleção. */
  range: [number, number] | null;
  onChange: (range: [number, number] | null) => void;
  onExplain: (term: string) => void;
};

/** "Frase que vi": toque nas palavras para escolher o termo (uma ou várias seguidas). */
export function SentencePicker({ tokens, range, onChange, onExplain }: Props) {
  const styles = useStyles();
  const c = strings.capture;
  const [a, b] = range ?? [-1, -1];
  const inRange = (i: number) => range != null && i >= Math.min(a, b) && i <= Math.max(a, b);

  const tap = (i: number) => {
    if (!range) return onChange([i, i]);
    if (a === b && a === i) return onChange(null);
    // estende a seleção até a palavra tocada (expressão contígua)
    onChange([Math.min(a, b, i), Math.max(a, b, i)]);
  };

  const term = range ? selectionText(tokens, a, b) : '';

  return (
    <View style={styles.wrapper}>
      <Text variant="label" color="textMuted">
        {c.tapTerm}
      </Text>
      <View style={styles.sentence}>
        {tokens.map((t, i) =>
          t.isWord ? (
            <Pressable
              key={`${t.start}`}
              onPress={() => tap(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: inRange(i) }}
              accessibilityLabel={t.text}
              style={[styles.word, inRange(i) && styles.wordSelected]}
            >
              <Text color={inRange(i) ? 'onPrimary' : 'text'}>{t.text}</Text>
            </Pressable>
          ) : t.text.trim() ? (
            <Text key={`${t.start}`} color="textMuted" style={styles.punct}>
              {t.text.trim()}
            </Text>
          ) : null,
        )}
      </View>
      {term ? (
        <Button label={`${c.explainSelection}: ${term}`} icon="zap" size="main" onPress={() => onExplain(term)} />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrapper: { gap: t.spacing.md },
  sentence: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.spacing.xs },
  word: {
    minHeight: t.sizes.chipHeight,
    justifyContent: 'center',
    paddingHorizontal: t.spacing.sm,
    borderRadius: t.radii.sm,
    backgroundColor: t.colors.surfaceAlt,
  },
  wordSelected: { backgroundColor: t.colors.primary },
  punct: { marginHorizontal: -t.spacing.xs / 2 },
}));
