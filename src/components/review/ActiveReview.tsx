import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { Button, CoachMark, Text } from '@/components/ui';
import { getCardWithNote } from '@/db/cardsRepo';
import { totalReviewCount } from '@/db/reviewLogsRepo';
import { buildCardContent } from '@/features/cards/content';
import { useExplainMore } from '@/features/cards/useExplainMore';
import { useReviewSession } from '@/features/review/sessionStore';
import { useReviewMenus } from '@/features/review/useReviewMenus';
import { useCoachMark } from '@/features/settings/useCoachMark';
import { strings } from '@/i18n/strings';
import { speak } from '@/lib/speech';
import type { StudyRating } from '@/srs/fsrs';
import { useSettings } from '@/stores/settingsStore';
import { showSnackbar } from '@/stores/snackbarStore';
import { makeStyles, useTheme } from '@/theme';

import { RatingBar } from './RatingBar';
import { ReviewCard } from './ReviewCard';
import { ReviewTopBar } from './ReviewTopBar';
import { TypeAnswerInput, TypeAnswerResult } from './TypeAnswer';
import { useReviewCoachHints } from './useReviewCoachHints';

const r = strings.review;
const TAP_HINT_UNTIL = 20;
const CARD_HEIGHT_RATIO = 0.62;
const TYPING_HEIGHT_RATIO = 0.4;

/** Sessão em andamento: topo, card com gestos e barra de avaliação (seção 8.3). */
export function ActiveReview() {
  const theme = useTheme();
  const styles = useStyles();
  const window = useWindowDimensions();
  const { queue, position, flipped, preview, history, busy, flip, rate, undo, replaceCard } = useReviewSession();
  const card = queue[position];
  const prefs = useSettings((s) => s.review);
  const coach = useCoachMark('review');
  const [guideOpen, setGuideOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [typed, setTyped] = useState<{ id: string; answer: string } | null>(null);
  const [reviewsSoFar, setReviewsSoFar] = useState<number | null>(null);
  const hints = useReviewCoachHints();

  const { run: explain } = useExplainMore((note) => card && replaceCard({ ...card, note }));
  const { openCardMenu, openTopMenu } = useReviewMenus({ onExplainMore: explain, onShowGuide: () => setGuideOpen(true) });

  useEffect(() => {
    totalReviewCount().then(setReviewsSoFar, () => setReviewsSoFar(TAP_HINT_UNTIL));
  }, []);

  // Voltando do editor: recarrega a nota do card atual.
  const cardId = card?.id;
  useFocusEffect(
    useCallback(() => {
      if (!cardId) return;
      getCardWithNote(cardId).then((fresh) => fresh && useReviewSession.getState().replaceCard(fresh));
    }, [cardId]),
  );

  // "Ouvir automaticamente": frente em Contexto/Lacuna; verso em Produção/Erro.
  useEffect(() => {
    if (!prefs.autoListen || !card) return;
    const content = buildCardContent(card.note, card.type);
    const readsFront = card.type === 'context' || card.type === 'cloze';
    if (readsFront && !flipped && content.front.speak) speak(content.front.speak);
    if (!readsFront && flipped && content.back.speak) speak(content.back.speak);
  }, [card, flipped, prefs.autoListen]);

  if (!card) return null;

  const typing = prefs.typeAnswer && (card.type === 'production' || card.type === 'error');
  const typedAnswer = typed?.id === card.id ? typed.answer : null;
  const cardWidth = window.width - theme.spacing.screen * 2;
  const cardHeight = window.height * (typing && !flipped ? TYPING_HEIGHT_RATIO : CARD_HEIGHT_RATIO);
  const expected = buildCardContent(card.note, card.type).back.speak ?? '';

  const onRate = async (rating: StudyRating) => {
    await rate(rating);
    showSnackbar(r.rated(r.ratings[rating]), {
      label: strings.common.undo,
      onPress: () => void undo().then((ok) => ok && showSnackbar(r.undone)),
    });
  };

  const onBlocked = () => {
    setBlocked(true);
    setTimeout(() => setBlocked(false), 1500);
  };

  return (
    <View style={styles.flex}>
      <ReviewTopBar
        done={position}
        total={queue.length}
        onExit={() => router.back()}
        onMenu={() => openTopMenu(card, history.length > 0, () => void undo())}
      />

      <View style={styles.stage}>
        <ReviewCard
          key={`${card.id}-${position}`}
          card={card}
          flipped={flipped}
          preview={preview}
          width={cardWidth}
          height={cardHeight}
          showTapHint={reviewsSoFar != null && reviewsSoFar < TAP_HINT_UNTIL}
          onFlip={flip}
          onRate={onRate}
          onLongPress={() => openCardMenu(card)}
          onBlocked={onBlocked}
          onNoteUpdated={(note) => replaceCard({ ...card, note })}
        />
        {blocked && (
          <Text variant="label" color="textMuted" align="center" accessibilityLiveRegion="polite">
            {r.flipFirst}
          </Text>
        )}
      </View>

      <View style={styles.bottom}>
        {flipped && typedAnswer != null && <TypeAnswerResult answer={typedAnswer} expected={expected} />}
        {!flipped && typing && (
          <TypeAnswerInput
            key={card.id}
            onSubmit={(answer) => {
              setTyped({ id: card.id, answer });
              flip();
            }}
          />
        )}
        {!flipped && !typing && <Button label={r.showAnswer} size="main" onPress={flip} />}
        {flipped && preview && <RatingBar preview={preview} onRate={onRate} disabled={busy} />}
      </View>

      <CoachMark
        visible={coach.visible || guideOpen}
        title={r.coach.title}
        motion="swipe"
        hints={hints}
        onDismiss={() => {
          coach.dismiss();
          setGuideOpen(false);
        }}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  stage: { flex: 1, justifyContent: 'center', paddingHorizontal: t.spacing.screen, gap: t.spacing.md },
  bottom: { paddingHorizontal: t.spacing.screen, paddingBottom: t.spacing.lg, gap: t.spacing.md },
}));
