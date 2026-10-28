import { ScrollView } from 'react-native';

import { Chip } from '@/components/ui';
import { CARD_STATES, CARD_TYPES, type CardType } from '@/features/cards/model';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

type Props = {
  types: CardType[];
  states: string[];
  onToggleType: (t: CardType) => void;
  onToggleState: (s: string) => void;
};

const STATE_FILTERS = [...CARD_STATES, 'suspended'] as const;

/** Filtros de "Meus cartões": tipo e estado (seção 7.6). */
export function CardFilters({ types, states, onToggleType, onToggleState }: Props) {
  const styles = useStyles();
  const c = strings.cards;

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {CARD_TYPES.map((t) => (
          <Chip key={t} label={c.types[t]} selected={types.includes(t)} onPress={() => onToggleType(t)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {STATE_FILTERS.map((s) => (
          <Chip key={s} label={c.states[s]} selected={states.includes(s)} onPress={() => onToggleState(s)} />
        ))}
      </ScrollView>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  row: { gap: t.spacing.sm, paddingHorizontal: t.spacing.screen },
}));
