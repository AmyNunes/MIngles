import { View } from 'react-native';

import { SpeakButton } from '@/components/cards/CardFaces';
import { TypeChip } from '@/components/cards/TypeChip';
import { Button, Text } from '@/components/ui';
import type { ExplainTermResult } from '@/ai/schemas/cards';
import type { CardType } from '@/features/cards/model';
import { strings } from '@/i18n/strings';
import { speak } from '@/lib/speech';
import { makeStyles } from '@/theme';

const c = strings.capture;

type Props = {
  data: ExplainTermResult;
  cardTypes: CardType[];
  onSave: () => void;
  saving: boolean;
  /** Botões extras (ex.: "Já conheço" no Leitor). */
  extraActions?: React.ReactNode;
};

/** Explicação de um termo: lema, IPA, significado, exemplo e "Salvar card". */
export function TermResultView({ data, cardTypes, onSave, saving, extraActions }: Props) {
  const styles = useStyles();

  return (
    <View style={styles.wrapper}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text variant="title">{data.lemma}</Text>
          <Text color="textMuted">
            {[data.ipa && `/${data.ipa.replace(/^\/|\/$/g, '')}/`, data.partOfSpeech].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <SpeakButton onPress={() => speak(data.lemma)} />
      </View>

      <View style={styles.block}>
        <Text variant="label" color="textMuted">
          {c.meaning}
        </Text>
        <Text variant="heading">{data.meaningPt}</Text>
        {data.explanationPt ? <Text>{data.explanationPt}</Text> : null}
      </View>

      {data.exampleEn ? (
        <View style={styles.block}>
          <Text variant="label" color="textMuted">
            {c.example}
          </Text>
          <View style={styles.exampleRow}>
            <Text style={[styles.flex, styles.english]}>{data.exampleEn}</Text>
            <SpeakButton onPress={() => speak(data.exampleEn)} />
          </View>
          {data.examplePt ? <Text color="textMuted">{data.examplePt}</Text> : null}
        </View>
      ) : null}

      <View style={styles.types}>
        {cardTypes.map((t) => (
          <TypeChip key={t} type={t} />
        ))}
      </View>
      <Button
        label={c.saveCards(cardTypes.length)}
        icon="bookmark"
        size="main"
        onPress={onSave}
        loading={saving}
      />
      {extraActions}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrapper: { gap: t.spacing.lg },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing.md },
  flex: { flex: 1 },
  block: { gap: t.spacing.xs },
  exampleRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  english: { fontStyle: 'italic' },
  types: { flexDirection: 'row', gap: t.spacing.sm },
}));
