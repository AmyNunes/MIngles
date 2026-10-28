import { router } from 'expo-router';
import { Alert } from 'react-native';

import { deleteCards, restoreCards, setSuspended } from '@/db/cardsRepo';
import { emitAppEvent } from '@/features/app/events';
import { buildCardContent } from '@/features/cards/content';
import type { CardWithNote, Note } from '@/features/cards/model';
import { strings } from '@/i18n/strings';
import { speak } from '@/lib/speech';
import { openActionSheet, type SheetAction } from '@/stores/actionSheetStore';
import { useSettings } from '@/stores/settingsStore';
import { showSnackbar } from '@/stores/snackbarStore';

import { useReviewSession } from './sessionStore';

const m = strings.review.menu;

type Options = {
  onExplainMore: (note: Note) => void;
  onShowGuide: () => void;
};

/** Menus da revisão: "segurar o card" e ⋯ no topo (seção 6.2 / 8.3). */
export function useReviewMenus({ onExplainMore, onShowGuide }: Options) {
  const review = useSettings((s) => s.review);
  const update = useSettings((s) => s.update);

  const suspend = async (card: CardWithNote) => {
    await setSuspended([card.id], true);
    useReviewSession.getState().dropCurrent();
    emitAppEvent('cardsChanged');
    showSnackbar(strings.review.suspended, {
      label: strings.common.undo,
      onPress: async () => {
        await setSuspended([card.id], false);
        useReviewSession.getState().insertAtCurrent(card);
        emitAppEvent('cardsChanged');
      },
    });
  };

  const remove = (card: CardWithNote) => {
    Alert.alert(strings.review.menu.delete, strings.review.deleteConfirm, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.delete,
        style: 'destructive',
        onPress: async () => {
          await deleteCards([card.id]);
          useReviewSession.getState().dropCurrent();
          emitAppEvent('cardsChanged');
          showSnackbar(strings.review.deleted, {
            label: strings.common.undo,
            onPress: async () => {
              await restoreCards([{ card, note: card.note }]);
              useReviewSession.getState().insertAtCurrent(card);
              emitAppEvent('cardsChanged');
            },
          });
        },
      },
    ]);
  };

  const openSource = (card: CardWithNote) => {
    if (card.note.sourceId) router.push(`/reader/${card.note.sourceId}`);
    else if (card.note.sourceLabel) showSnackbar(card.note.sourceLabel);
  };

  /** Segurar o card: Editar, Ouvir devagar, Explicar mais (IA), Suspender, Excluir, Ver origem. */
  const openCardMenu = (card: CardWithNote) => {
    const content = buildCardContent(card.note, card.type);
    const speakText = content.back.speak ?? content.front.speak;
    const actions: SheetAction[] = [
      { label: m.edit, icon: 'edit-2', onPress: () => router.push(`/cards/${card.id}`) },
      ...(speakText
        ? [{ label: m.listenSlow, icon: 'volume-1' as const, onPress: () => speak(speakText, { slow: true }) }]
        : []),
      { label: m.explainMore, icon: 'zap', onPress: () => onExplainMore(card.note) },
      { label: m.suspend, icon: 'pause-circle', onPress: () => void suspend(card) },
      { label: m.delete, icon: 'trash-2', destructive: true, onPress: () => remove(card) },
      ...(card.note.sourceId || card.note.sourceLabel
        ? [{ label: m.source, icon: 'external-link' as const, onPress: () => openSource(card) }]
        : []),
    ];
    openActionSheet(actions, card.note.term);
  };

  /** ⋯ no topo: Editar card, Desfazer última, Responder digitando, Ouvir automaticamente, Guia de gestos. */
  const openTopMenu = (card: CardWithNote | undefined, canUndo: boolean, onUndo: () => void) => {
    const actions: SheetAction[] = [
      ...(card ? [{ label: m.edit, icon: 'edit-2' as const, onPress: () => router.push(`/cards/${card.id}`) }] : []),
      ...(canUndo ? [{ label: m.undo, icon: 'rotate-ccw' as const, onPress: onUndo }] : []),
      {
        label: m.typeAnswer,
        icon: 'type',
        checked: review.typeAnswer,
        onPress: () => void update('review', { typeAnswer: !review.typeAnswer }),
      },
      {
        label: m.autoListen,
        icon: 'headphones',
        checked: review.autoListen,
        onPress: () => void update('review', { autoListen: !review.autoListen }),
      },
      { label: m.gestureGuide, icon: 'help-circle', onPress: onShowGuide },
    ];
    openActionSheet(actions);
  };

  return { openCardMenu, openTopMenu };
}
