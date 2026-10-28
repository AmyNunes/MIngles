import { useEffect } from 'react';
import { View, type LayoutRectangle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { Text } from '@/components/ui';
import { atomsOf } from '@/features/reader/atoms';
import type { ReaderParagraph } from '@/features/reader/document';
import { makeStyles, TINT, useTheme, withAlpha } from '@/theme';

import { TranslationBox } from './TranslationBox';

export type Selection = { from: number; to: number };

type Props = {
  /** Identifica o texto (para guardar a posição das palavras). */
  docKey: string;
  paragraph: ReaderParagraph;
  fontSize: number;
  learning: Set<number>;
  /** Seleção (arrastar) ou palavra do painel aberto. */
  selection: Selection | null;
  translatedSentences: Set<number>;
  showTranslation: boolean;
  onWordTap: (wordIndex: number) => void;
  onSentenceDoubleTap: (sentence: number) => void;
  onSelecting: (sel: Selection) => void;
  onSelectEnd: (sel: Selection) => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
};

const SWIPE_DISTANCE = 60;

type WordBox = LayoutRectangle & { chunk: number };

/**
 * Posição de cada palavra (para saber qual palavra está sob o dedo).
 * Fica fora do React: só é lida e escrita nos gestos e no onLayout.
 */
const wordBoxes = new Map<string, Map<number, WordBox>>();
const dragStarts = new Map<string, number>();

function boxesOf(key: string): Map<number, WordBox> {
  let boxes = wordBoxes.get(key);
  if (!boxes) {
    boxes = new Map();
    wordBoxes.set(key, boxes);
  }
  return boxes;
}
const LINE_HEIGHT_RATIO = 30 / 19;

/** Fatias do parágrafo: quebra depois de cada frase traduzida (a tradução aparece logo abaixo dela). */
function chunksOf(p: ReaderParagraph, translated: Set<number>) {
  const ends = [...translated]
    .map((s) => p.sentenceOf.lastIndexOf(s) + 1)
    .filter((e) => e > 0)
    .sort((a, b) => a - b);
  const bounds = [...new Set([...ends, p.tokens.length])];
  let start = 0;
  return bounds.map((end) => {
    const chunk = { start, end, sentence: translated.has(p.sentenceOf[end - 1]) ? p.sentenceOf[end - 1] : null };
    start = end;
    return chunk;
  });
}

/** Um parágrafo do leitor, com os gestos da seção 6.3. */
export function ParagraphView(props: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const { paragraph: p, fontSize } = props;
  const key = `${props.docKey}:${p.index}`;

  useEffect(
    () => () => {
      wordBoxes.delete(key);
      dragStarts.delete(key);
    },
    [key],
  );

  const hit = (chunk: number, x: number, y: number): number | null => {
    let best: number | null = null;
    let bestDist = Infinity;
    for (const [index, l] of boxesOf(key)) {
      if (l.chunk !== chunk) continue;
      if (x >= l.x && x <= l.x + l.width && y >= l.y && y <= l.y + l.height) return index;
      const dx = Math.max(l.x - x, 0, x - (l.x + l.width));
      const dy = Math.max(l.y - y, 0, y - (l.y + l.height));
      const dist = dx * dx + dy * dy * 4;
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    }
    return best;
  };

  const gestureFor = (chunk: number) => {
    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDuration(300)
      .onEnd((e, ok) => {
        const i = ok ? hit(chunk, e.x, e.y) : null;
        if (i != null) props.onWordTap(i);
      });
    const doubleTap = Gesture.Tap()
      .runOnJS(true)
      .numberOfTaps(2)
      .onEnd((e, ok) => {
        const i = ok ? hit(chunk, e.x, e.y) : null;
        if (i != null) props.onSentenceDoubleTap(p.sentenceOf[i]);
      });
    const drag = Gesture.Pan()
      .runOnJS(true)
      .activateAfterLongPress(350)
      .onStart((e) => {
        const i = hit(chunk, e.x, e.y);
        if (i == null) return;
        dragStarts.set(key, i);
        props.onSelecting({ from: i, to: i });
      })
      .onUpdate((e) => {
        const i = hit(chunk, e.x, e.y);
        const start = dragStarts.get(key);
        if (start != null && i != null) props.onSelecting({ from: start, to: i });
      })
      .onEnd((e) => {
        const i = hit(chunk, e.x, e.y);
        const start = dragStarts.get(key);
        if (start != null && i != null) props.onSelectEnd({ from: start, to: i });
        dragStarts.delete(key);
      });
    const swipe = Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-30, 30])
      .failOffsetY([-14, 14])
      .onEnd((e) => {
        if (e.translationX < -SWIPE_DISTANCE) props.onSwipeLeft();
        else if (e.translationX > SWIPE_DISTANCE) props.onSwipeRight();
      });
    return Gesture.Race(swipe, drag, Gesture.Exclusive(doubleTap, tap));
  };

  const sel = props.selection;
  const inSelection = (i: number) => sel != null && i >= Math.min(sel.from, sel.to) && i <= Math.max(sel.from, sel.to);
  const textStyle = { fontSize, lineHeight: Math.round(fontSize * LINE_HEIGHT_RATIO) };

  return (
    <View style={styles.paragraph}>
      {chunksOf(p, props.translatedSentences).map((chunk, ci) => (
        <View key={chunk.start}>
          <GestureDetector gesture={gestureFor(ci)}>
            <View style={styles.flow} accessible accessibilityLabel={p.text.slice(p.tokens[chunk.start]?.start ?? 0, p.tokens[chunk.end - 1]?.end)}>
              {atomsOf(p.tokens, chunk.start, chunk.end).map((atom, ai) => {
                const w = atom.wordIndex;
                return (
                  <View
                    key={`${ai}-${w ?? 'p'}`}
                    onLayout={w == null ? undefined : (e) => boxesOf(key).set(w, { ...e.nativeEvent.layout, chunk: ci })}
                    style={[
                      styles.atom,
                      w != null && props.learning.has(w) && styles.learning,
                      w != null && inSelection(w) && { backgroundColor: withAlpha(theme.colors.primary, TINT * 1.6) },
                    ]}
                  >
                    <Text variant="reading" style={textStyle}>
                      {atom.text}
                    </Text>
                  </View>
                );
              })}
            </View>
          </GestureDetector>
          {chunk.sentence != null && <TranslationBox text={p.sentences[chunk.sentence].text} />}
        </View>
      ))}
      {props.showTranslation && <TranslationBox text={p.text} />}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  paragraph: { paddingVertical: t.spacing.sm },
  flow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
  atom: { marginRight: t.spacing.xs, borderRadius: t.radii.sm / 2 },
  learning: {
    borderBottomWidth: 2,
    borderStyle: 'dotted',
    borderBottomColor: t.colors.typeCloze,
  },
}));
