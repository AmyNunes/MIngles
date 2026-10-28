import { useState } from 'react';
import { View } from 'react-native';

import { DiffText } from '@/components/cards/DiffText';
import { Button, Card, Text, TextField } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const r = strings.review;

type InputProps = { onSubmit: (answer: string) => void };

/** "Responder digitando": digito antes de virar (cards de Produção e Erro). */
export function TypeAnswerInput({ onSubmit }: InputProps) {
  const styles = useStyles();
  const [answer, setAnswer] = useState('');

  return (
    <View style={styles.input}>
      <TextField
        label={r.typeHere}
        value={answer}
        onChangeText={setAnswer}
        autoCapitalize="sentences"
        onSubmitEditing={() => onSubmit(answer)}
        returnKeyType="done"
      />
      <Button label={r.check} icon="check" onPress={() => onSubmit(answer)} />
    </View>
  );
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/[.!?,;:]+$/g, '').replace(/\s+/g, ' ');

/** No verso: compara a resposta digitada com a esperada (diff local, sem IA). */
export function TypeAnswerResult({ answer, expected }: { answer: string; expected: string }) {
  const perfect = normalize(answer) === normalize(expected);
  return (
    <Card>
      <Text variant="label" color="textMuted">
        {perfect ? r.perfect : r.yourAnswer}
      </Text>
      {perfect ? <Text>{answer}</Text> : <DiffText original={answer || '—'} corrected={expected} />}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  input: { gap: t.spacing.md },
}));
