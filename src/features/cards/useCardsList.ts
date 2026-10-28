import { useEffect, useState } from 'react';

import { deleteCards, listCards, restoreCards, setSuspended, type CardFilter } from '@/db/cardsRepo';
import { emitAppEvent } from '@/features/app/events';
import { strings } from '@/i18n/strings';
import { useLoader } from '@/lib/useLoader';
import { showSnackbar } from '@/stores/snackbarStore';

import type { CardType, CardWithNote } from './model';

const l = strings.cardsList;
const SEARCH_DEBOUNCE_MS = 250;

/** Estado de "Meus cartões": busca, filtros, seleção e ações em lote. */
export function useCardsList() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [types, setTypes] = useState<CardType[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const filter: CardFilter = { search: debounced, types, states };
  const loader = useLoader(() => listCards(filter), JSON.stringify(filter));
  const cards = loader.state.status === 'success' ? loader.state.data : [];

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const after = () => {
    setSelected(new Set());
    emitAppEvent('cardsChanged');
    loader.refresh();
  };

  const remove = async (items: CardWithNote[]) => {
    await deleteCards(items.map((c) => c.id));
    after();
    showSnackbar(l.deleted(items.length), {
      label: strings.common.undo,
      onPress: async () => {
        await restoreCards(items.map((c) => ({ card: c, note: c.note })));
        after();
      },
    });
  };

  const suspend = async (items: CardWithNote[], value: boolean) => {
    await setSuspended(items.map((c) => c.id), value);
    after();
    showSnackbar(value ? l.suspendedDone(items.length) : l.reactivated(items.length), {
      label: strings.common.undo,
      onPress: async () => {
        await setSuspended(items.map((c) => c.id), !value);
        after();
      },
    });
  };

  const selectedCards = cards.filter((c) => selected.has(c.id));

  return {
    loader,
    cards,
    search,
    setSearch,
    types,
    toggleType: (t: CardType) => setTypes((prev) => toggle(prev, t)),
    states,
    toggleState: (s: string) => setStates((prev) => toggle(prev, s)),
    selecting: selected.size > 0,
    selected,
    selectedCards,
    toggleSelected,
    clearSelection: () => setSelected(new Set()),
    remove,
    suspend,
  };
}
