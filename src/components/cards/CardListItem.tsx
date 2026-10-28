import { Pressable, View } from 'react-native';

import { Icon, IconButton, Text } from '@/components/ui';
import { buildCardContent, segmentsToText } from '@/features/cards/content';
import type { CardWithNote } from '@/features/cards/model';
import { strings } from '@/i18n/strings';
import { formatInterval } from '@/srs/fsrs';
import { makeStyles, useTheme } from '@/theme';

import { TypeChip } from './TypeChip';

type Props = {
  card: CardWithNote;
  /** Fim do dia de estudo (ISO): vence até aqui = "para hoje". */
  endOfToday: string;
  selecting: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  /** Menu ⋯ do item: alternativa visível aos gestos de deslizar. */
  onMenu: () => void;
};

export function dueLabel(card: CardWithNote, endOfToday: string): string {
  const c = strings.cards.states;
  if (card.suspended) return c.suspended;
  if (card.state === 0) return c.new;
  if (card.due <= endOfToday) return strings.cardsList.dueToday;
  return strings.cardsList.dueIn(formatInterval(new Date(), new Date(card.due)));
}

/** Linha de "Meus cartões": tipo, termo, resposta e quando vence. */
export function CardListItem({ card, endOfToday, selecting, selected, onPress, onLongPress, onMenu }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const content = buildCardContent(card.note, card.type);
  const answer = segmentsToText(content.back.main);
  const due = dueLabel(card, endOfToday);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole={selecting ? 'checkbox' : 'button'}
      accessibilityState={selecting ? { checked: selected } : undefined}
      accessibilityLabel={`${strings.cards.types[card.type]}: ${card.note.term}. ${answer}. ${due}`}
      style={({ pressed }) => [styles.row, (pressed || selected) && styles.pressed, card.suspended && styles.suspended]}
    >
      {selecting && (
        <View style={[styles.box, selected && styles.boxOn]}>
          {selected && <Icon name="check" color="onPrimary" size={theme.sizes.iconSmall} />}
        </View>
      )}
      <View style={styles.texts}>
        <View style={styles.top}>
          <TypeChip type={card.type} />
          <Text variant="caption" color="textMuted">
            {due}
          </Text>
        </View>
        <Text variant="heading" numberOfLines={2}>
          {card.note.term}
        </Text>
        <Text color="textMuted" numberOfLines={1}>
          {answer}
        </Text>
      </View>
      {!selecting && (
        <IconButton icon="more-vertical" color="textMuted" accessibilityLabel={strings.common.more} onPress={onMenu} />
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    backgroundColor: t.colors.surface,
  },
  pressed: { backgroundColor: t.colors.surfaceAlt },
  suspended: { opacity: t.opacity.pressed },
  texts: { flex: 1, gap: t.spacing.xs },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.sm },
  box: {
    width: t.sizes.iconSmall + t.spacing.sm,
    height: t.sizes.iconSmall + t.spacing.sm,
    borderRadius: t.radii.sm,
    borderWidth: 2,
    borderColor: t.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
}));
