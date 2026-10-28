import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, IconBadge, ListGroup, ListRow, Screen, Text } from '@/components/ui';
import { buildCardContent, segmentsToText } from '@/features/cards/content';
import type { CardWithNote } from '@/features/cards/model';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const s = strings.review.summary;

type Props = {
  minimal: boolean;
  reviewed: number;
  accuracy: number;
  durationMs: number;
  hardest: CardWithNote[];
  /** Próxima etapa da sessão do dia (ex.: Desafio do dia). */
  nextStep?: { label: string; onPress: () => void };
};

function Stat({ value, label }: { value: string; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Text variant="display">{value}</Text>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </View>
  );
}

/** Fim da sessão: resumo, "os que mais custaram" e a próxima etapa (seção 8.3). */
export function SessionSummary({ minimal, reviewed, accuracy, durationMs, hardest, nextStep }: Props) {
  const styles = useStyles();
  const minutes = Math.max(1, Math.round(durationMs / 60_000));

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <View style={styles.buttons}>
          {nextStep && <Button label={s.nextStep(nextStep.label)} icon="arrow-right" size="main" onPress={nextStep.onPress} />}
          <Button
            label={s.backToToday}
            variant={nextStep ? 'ghost' : 'primary'}
            size={nextStep ? 'regular' : 'main'}
            onPress={() => router.back()}
          />
        </View>
      }
    >
      <View style={styles.hero}>
        <IconBadge icon="check" color="rateGood" size="lg" />
        <Text variant="title" align="center" accessibilityRole="header">
          {minimal ? s.minimalTitle : s.title}
        </Text>
        {minimal && (
          <Text color="textMuted" align="center">
            {s.minimalNote}
          </Text>
        )}
      </View>

      <Card>
        <View style={styles.stats}>
          <Stat value={String(reviewed)} label={s.reviewed} />
          <Stat value={`${Math.round(accuracy * 100)}%`} label={s.accuracy} />
          <Stat value={strings.review.interval.minutes(minutes)} label={s.time} />
        </View>
      </Card>

      {hardest.length > 0 && (
        <ListGroup title={s.hardest}>
          {hardest.map((card) => {
            const content = buildCardContent(card.note, card.type);
            return (
              <ListRow
                key={card.id}
                icon="edit-2"
                iconColor="rateAgain"
                title={card.note.term}
                subtitle={segmentsToText(content.back.main)}
                onPress={() => router.push(`/cards/${card.id}`)}
              />
            );
          })}
        </ListGroup>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  hero: { alignItems: 'center', gap: t.spacing.md, paddingTop: t.spacing.huge },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: t.spacing.xs / 2 },
  buttons: { gap: t.spacing.sm },
}));
