import { useState } from 'react';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { CardBack, CardFront } from '@/components/cards/CardFaces';
import { CardDetailsSheet } from '@/components/cards/CardDetailsSheet';
import { FlashCard } from '@/components/cards/FlashCard';
import { buildCardContent, segmentsToText } from '@/features/cards/content';
import type { CardWithNote, Note } from '@/features/cards/model';
import { useExplainMore } from '@/features/cards/useExplainMore';
import { SWIPE_THRESHOLDS } from '@/features/settings/schemas';
import { useSwipeToRate } from '@/gestures/useSwipeToRate';
import { haptics } from '@/lib/haptics';
import { speak } from '@/lib/speech';
import type { RatingPreview, StudyRating } from '@/srs/fsrs';
import { useSettings } from '@/stores/settingsStore';

import { SwipeOverlay } from './SwipeOverlay';

type Props = {
  card: CardWithNote;
  flipped: boolean;
  preview: RatingPreview | null;
  width: number;
  height: number;
  showTapHint: boolean;
  onFlip: () => void;
  onRate: (rating: StudyRating) => void;
  onLongPress: () => void;
  onBlocked: () => void;
  onNoteUpdated: (note: Note) => void;
};

/** O card da revisão: flashcard + gestos (seção 6.2) + sobreposição colorida do arraste. */
export function ReviewCard(props: Props) {
  const { card, flipped, preview, width, height } = props;
  const gestures = useSettings((s) => s.gestures);
  const threshold = SWIPE_THRESHOLDS[gestures.sensitivity];
  const content = buildCardContent(card.note, card.type);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { explaining, run } = useExplainMore(props.onNoteUpdated);

  const speakFront = () => content.front.speak && speak(content.front.speak);
  const speakBack = () => content.back.speak && speak(content.back.speak);
  const speakCurrent = () => (flipped ? speakBack() : speakFront() || speakBack());

  const { gesture, cardStyle, drag } = useSwipeToRate({
    enabled: gestures.enabled,
    canRate: flipped,
    width,
    height,
    threshold,
    leftHanded: gestures.leftHanded,
    onRate: props.onRate,
    onBlocked: props.onBlocked,
    onCrossThreshold: haptics.light,
    onTap: () => {
      if (!flipped) props.onFlip();
    },
    onDoubleTap: speakCurrent,
    onLongPress: () => {
      haptics.light();
      props.onLongPress();
    },
  });

  const label = flipped
    ? segmentsToText(content.back.main)
    : [content.front.prompt, segmentsToText(content.front.main), content.front.hint].filter(Boolean).join(' ');

  return (
    <>
      <GestureDetector gesture={gesture}>
        <Animated.View style={cardStyle}>
          <FlashCard
            flipped={flipped}
            height={height}
            accessibilityLabel={label}
            front={
              <CardFront
                content={content}
                sourceLabel={card.note.sourceLabel}
                showTapHint={props.showTapHint}
                onSpeak={speakFront}
              />
            }
            back={
              <CardBack
                content={content}
                onSpeak={speakBack}
                onExplainMore={() => run(card.note)}
                explaining={explaining}
                hasExtra={card.note.extra != null}
                onSeeMore={() => setDetailsOpen(true)}
              />
            }
          />
          {preview && (
            <SwipeOverlay
              drag={drag}
              preview={preview}
              width={width}
              height={height}
              threshold={threshold}
              leftHanded={gestures.leftHanded}
            />
          )}
        </Animated.View>
      </GestureDetector>
      <CardDetailsSheet
        visible={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        content={content}
        extra={card.note.extra}
      />
    </>
  );
}
