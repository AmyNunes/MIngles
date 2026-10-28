import { useState } from 'react';
import { Pressable } from 'react-native';

import { Text } from '@/components/ui';
import { buildCardContent } from '@/features/cards/content';
import type { CardType, NoteContent } from '@/features/cards/model';
import { strings } from '@/i18n/strings';
import { speak } from '@/lib/speech';

import { CardBack, CardFront } from './CardFaces';
import { FlashCard } from './FlashCard';

const PREVIEW_HEIGHT = 340;

/** Prévia ao vivo do card no editor: toque alterna frente/verso. */
export function CardPreview({ content, type }: { content: NoteContent; type: CardType }) {
  const [flipped, setFlipped] = useState(false);
  const built = buildCardContent(content, type);

  return (
    <>
      <Text variant="label" color="textMuted">
        {strings.editor.preview}
      </Text>
      <Pressable
        onPress={() => setFlipped((f) => !f)}
        accessibilityRole="button"
        accessibilityLabel={flipped ? strings.cards.back : strings.cards.front}
        accessibilityHint={strings.cards.tapToFlip}
      >
        <FlashCard
          flipped={flipped}
          height={PREVIEW_HEIGHT}
          front={<CardFront content={built} onSpeak={() => built.front.speak && speak(built.front.speak)} />}
          back={
            <CardBack
              content={built}
              onSpeak={() => built.back.speak && speak(built.back.speak)}
              onSeeMore={() => setFlipped(false)}
            />
          }
        />
      </Pressable>
    </>
  );
}
