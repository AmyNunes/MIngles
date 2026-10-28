import { View } from 'react-native';

import { Notice, Sheet, Text } from '@/components/ui';
import type { CardContent } from '@/features/cards/content';
import type { ExplainMore } from '@/features/cards/model';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

import { DiffText } from './DiffText';
import { Segments } from './Segments';

type Props = {
  visible: boolean;
  onClose: () => void;
  content: CardContent;
  extra: ExplainMore | null;
};

/** "ver mais": verso completo do card e o "Explicar mais (IA)" salvo na nota. */
export function CardDetailsSheet({ visible, onClose, content, extra }: Props) {
  const styles = useStyles();
  const { back } = content;
  const c = strings.cards;

  return (
    <Sheet visible={visible} onClose={onClose} title={c.moreTitle}>
      {back.diff ? (
        <DiffText original={back.diff.original} corrected={back.diff.corrected} variant="heading" />
      ) : (
        <Segments segments={back.main} size="body" align="left" />
      )}
      {back.ipa ? <Text color="textMuted">/{back.ipa.replace(/^\/|\/$/g, '')}/</Text> : null}
      {back.details.map((d) => (
        <Text key={d.text} color={d.en ? 'text' : 'textMuted'} style={d.en && styles.english}>
          {d.label ? `${d.label}: ` : ''}
          {d.text}
        </Text>
      ))}

      {extra && (
        <>
          <View style={styles.divider} />
          <Text>{extra.explanationPt}</Text>
          {extra.extraExamples.length > 0 && (
            <View style={styles.block}>
              <Text variant="label" color="textMuted">
                {c.extraExamples}
              </Text>
              {extra.extraExamples.map((ex) => (
                <View key={ex.en} style={styles.example}>
                  <Text style={styles.english}>{ex.en}</Text>
                  <Text variant="caption" color="textMuted">
                    {ex.pt}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {extra.commonMistakesPt ? (
            <Notice tone="warning" icon="alert-triangle">
              <Text variant="label">{c.commonMistakes}</Text>
              <Text>{extra.commonMistakesPt}</Text>
            </Notice>
          ) : null}
        </>
      )}
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  divider: { height: 1, backgroundColor: t.colors.border },
  block: { gap: t.spacing.md },
  example: { gap: t.spacing.xs / 2 },
  english: { fontStyle: 'italic' },
}));
