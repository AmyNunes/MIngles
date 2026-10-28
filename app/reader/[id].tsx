import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ParagraphView } from '@/components/reader/ParagraphView';
import { ReaderTopBar } from '@/components/reader/ReaderTopBar';
import { TitleSheet } from '@/components/reader/TitleSheet';
import { WordPanel } from '@/components/reader/WordPanel';
import { CoachMark, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { useReader } from '@/features/reader/useReader';
import { useCoachMark } from '@/features/settings/useCoachMark';
import { strings } from '@/i18n/strings';
import { openActionSheet } from '@/stores/actionSheetStore';
import { makeStyles } from '@/theme';

const r = strings.reader;
const PINCH_IN = 0.87;
const PINCH_OUT = 1.15;
const EMPTY = new Set<number>();

export default function ReaderScreen() {
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reader = useReader(id);
  const coach = useCoachMark('reader');
  const [guideOpen, setGuideOpen] = useState(false);
  const [titleOpen, setTitleOpen] = useState(false);
  const [firstVisible, setFirstVisible] = useState(0);

  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onEnd((e) => {
      if (e.scale > PINCH_OUT) reader.changeFont(1);
      else if (e.scale < PINCH_IN) reader.changeFont(-1);
    });

  const openMenu = () =>
    openActionSheet([
      { label: r.menu.fontSmaller, icon: 'minus', onPress: () => reader.changeFont(-1) },
      { label: r.menu.fontBigger, icon: 'plus', onPress: () => reader.changeFont(1) },
      {
        label: reader.showAll ? r.menu.hideTranslations : r.menu.showTranslations,
        icon: 'globe',
        checked: reader.showAll,
        onPress: reader.toggleAll,
      },
      { label: r.menu.markRead, icon: 'check-circle', onPress: reader.markRead },
      { label: r.menu.editTitle, icon: 'edit-2', onPress: () => setTitleOpen(true) },
      { label: strings.review.menu.gestureGuide, icon: 'help-circle', onPress: () => setGuideOpen(true) },
    ]);

  if (reader.status !== 'ready' || !reader.source) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ReaderTopBar title="" playing={false} onBack={() => router.back()} onPlay={() => {}} onMenu={() => {}} />
        <View style={styles.center}>
          {reader.status === 'loading' && (
            <View style={styles.skeleton}>
              <Skeleton height={20} />
              <Skeleton height={20} width="85%" />
              <Skeleton height={20} width="92%" />
            </View>
          )}
          {reader.status === 'error' && <ErrorState onRetry={reader.retry} />}
          {reader.status === 'notFound' && <EmptyState icon="book" message={r.notFound} />}
        </View>
      </SafeAreaView>
    );
  }

  const source = reader.source;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ReaderTopBar
        title={source.title}
        playing={reader.playing != null}
        onBack={() => router.back()}
        onPlay={() => (reader.playing != null ? reader.stop() : reader.playFrom(firstVisible))}
        onMenu={openMenu}
      />
      <GestureDetector gesture={pinch}>
        <View style={styles.flex}>
          <FlashList
            data={reader.doc}
            keyExtractor={(p) => String(p.index)}
            initialScrollIndex={Math.floor(source.readingPosition) || undefined}
            contentContainerStyle={styles.content}
            extraData={reader}
            onViewableItemsChanged={({ viewableItems }) => {
              const first = viewableItems[0]?.index;
              if (first != null) {
                setFirstVisible(first);
                reader.savePosition(first);
              }
            }}
            renderItem={({ item: p }) => (
              <ParagraphView
                docKey={source.id}
                paragraph={p}
                fontSize={reader.fontSize}
                learning={reader.learning[p.index] ?? EMPTY}
                selection={reader.selection?.p === p.index ? reader.selection.sel : null}
                translatedSentences={reader.sentenceTr.get(p.index) ?? EMPTY}
                showTranslation={reader.showAll || reader.paragraphTr.has(p.index)}
                onWordTap={(i) => reader.tapWord(p.index, i)}
                onSentenceDoubleTap={(s) => reader.toggleSentence(p.index, s)}
                onSelecting={(sel) => reader.selecting(p.index, sel)}
                onSelectEnd={(sel) => reader.selectEnd(p.index, sel)}
                onSwipeLeft={() => reader.toggleParagraph(p.index)}
                onSwipeRight={() => reader.listenParagraph(p.index)}
              />
            )}
          />
        </View>
      </GestureDetector>

      <WordPanel
        target={reader.panel}
        source={reader.noteSource}
        onClose={reader.closePanel}
        onTranslateSentence={(t) => {
          reader.toggleSentence(t.paragraph, t.sentenceIndex, true);
          reader.closePanel();
        }}
        onVocabChanged={reader.refreshVocab}
      />
      <TitleSheet visible={titleOpen} title={source.title} onClose={() => setTitleOpen(false)} onSave={(t) => void reader.rename(t)} />
      <CoachMark
        visible={coach.visible || guideOpen}
        title={r.coach.title}
        motion="tap"
        hints={[
          { icon: 'mouse-pointer', text: r.coach.tap },
          { icon: 'maximize-2', text: r.coach.hold },
          { icon: 'globe', text: r.coach.doubleTap },
          { icon: 'arrow-left', text: r.coach.swipeLeft },
          { icon: 'arrow-right', text: r.coach.swipeRight },
          { icon: 'zoom-in', text: r.coach.pinch },
        ]}
        onDismiss={() => {
          coach.dismiss();
          setGuideOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', padding: t.spacing.xl },
  skeleton: { gap: t.spacing.md },
  content: { paddingHorizontal: t.spacing.xl, paddingBottom: t.spacing.huge },
}));
