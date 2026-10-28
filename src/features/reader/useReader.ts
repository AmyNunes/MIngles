import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import type { Selection } from '@/components/reader/ParagraphView';
import type { PanelTarget } from '@/components/reader/WordPanel';
import { getSource, updateSource, type Source } from '@/db/sourcesRepo';
import { strings } from '@/i18n/strings';
import { formatDayMonth, nowIso } from '@/lib/dates';
import { speak, stopSpeaking } from '@/lib/speech';
import { selectionText } from '@/lib/tokenize';
import { useSettings } from '@/stores/settingsStore';
import { showSnackbar } from '@/stores/snackbarStore';

import { buildDocument, learningTokens, type VocabIndex } from './document';
import { loadVocabIndex, markTextAsKnown } from './vocabService';

const EMPTY_VOCAB: VocabIndex = { learning: new Set(), learningPhrases: [], known: new Set() };
export const READER_FONT = { min: 16, max: 26 };
const SAVE_POSITION_MS = 800;

const toggleIn = <T,>(set: Set<T>, value: T, on?: boolean) => {
  const next = new Set(set);
  if (on ?? !next.has(value)) next.add(value);
  else next.delete(value);
  return next;
};

/** Estado do Leitor (seção 8.4): texto, realce, traduções, painel, leitura em voz alta e posição. */
export function useReader(id: string) {
  const fontSize = useSettings((s) => s.appearance.readerFontSize);
  const update = useSettings((s) => s.update);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notFound' | 'error'>('loading');
  const [source, setSource] = useState<Source | null>(null);
  const [vocab, setVocab] = useState<VocabIndex>(EMPTY_VOCAB);
  const [vocabVersion, setVocabVersion] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const [showAll, setShowAll] = useState(false);
  const [paragraphTr, setParagraphTr] = useState<Set<number>>(new Set());
  const [sentenceTr, setSentenceTr] = useState<Map<number, Set<number>>>(new Map());
  const [selection, setSelection] = useState<{ p: number; sel: Selection } | null>(null);
  const [panel, setPanel] = useState<PanelTarget | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const playRun = useRef(0);
  const positionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    getSource(id).then(
      (s) => {
        if (!alive) return;
        setSource(s);
        setStatus(s ? 'ready' : 'notFound');
        if (s) void updateSource(id, { lastReadAt: nowIso() });
      },
      () => alive && setStatus('error'),
    );
    return () => {
      alive = false;
    };
  }, [id, attempt]);

  useEffect(() => {
    let alive = true;
    loadVocabIndex().then((v) => alive && setVocab(v), () => {});
    return () => {
      alive = false;
    };
  }, [vocabVersion]);

  useEffect(
    () => () => {
      playRun.current++;
      stopSpeaking();
      if (positionTimer.current) clearTimeout(positionTimer.current);
    },
    [],
  );

  const content = source?.content ?? '';
  const doc = useMemo(() => buildDocument(content), [content]);
  const learning = useMemo(() => doc.map((p) => learningTokens(p, vocab)), [doc, vocab]);

  const targetFor = (p: number, from: number, to: number): PanelTarget => {
    const para = doc[p];
    const sentenceIndex = para.sentenceOf[Math.min(from, to)];
    return {
      term: selectionText(para.tokens, from, to),
      sentence: para.sentences[sentenceIndex]?.text ?? para.text,
      paragraph: p,
      sentenceIndex,
    };
  };

  const stop = () => {
    playRun.current++;
    stopSpeaking();
    setPlaying(null);
  };

  const playFrom = (start: number) => {
    const run = ++playRun.current;
    const next = (i: number) => {
      if (run !== playRun.current) return;
      if (i >= doc.length) return setPlaying(null);
      setPlaying(i);
      speak(doc[i].text, { onDone: () => next(i + 1) });
    };
    next(start);
  };

  const sourceLabel = source ? strings.reader.sourceLabel(source.title, formatDayMonth(new Date())) : '';

  return {
    status,
    retry: () => {
      setStatus('loading');
      setAttempt((a) => a + 1);
    },
    source,
    doc,
    learning,
    fontSize,
    showAll,
    paragraphTr,
    sentenceTr,
    selection,
    panel,
    playing,
    noteSource: { id: source?.id ?? null, label: sourceLabel },

    tapWord: (p: number, i: number) => {
      setSelection({ p, sel: { from: i, to: i } });
      setPanel(targetFor(p, i, i));
    },
    selecting: (p: number, sel: Selection) => setSelection({ p, sel }),
    selectEnd: (p: number, sel: Selection) => {
      setSelection({ p, sel });
      setPanel(targetFor(p, sel.from, sel.to));
    },
    closePanel: () => {
      setPanel(null);
      setSelection(null);
    },
    toggleSentence: (p: number, s: number, on?: boolean) =>
      setSentenceTr((prev) => new Map(prev).set(p, toggleIn(prev.get(p) ?? new Set(), s, on))),
    toggleParagraph: (p: number) => setParagraphTr((prev) => toggleIn(prev, p)),
    toggleAll: () => setShowAll((v) => !v),
    listenParagraph: (p: number) => {
      stop();
      speak(doc[p].text);
    },
    playFrom,
    stop,
    changeFont: (delta: number) => {
      const next = Math.max(READER_FONT.min, Math.min(READER_FONT.max, fontSize + delta));
      if (next !== fontSize) void update('appearance', { readerFontSize: next });
    },
    refreshVocab: () => setVocabVersion((v) => v + 1),
    savePosition: (index: number) => {
      if (positionTimer.current) clearTimeout(positionTimer.current);
      positionTimer.current = setTimeout(() => void updateSource(id, { readingPosition: index, lastReadAt: nowIso() }), SAVE_POSITION_MS);
    },
    markRead: () =>
      Alert.alert(strings.reader.markReadTitle, strings.reader.markReadConfirm, [
        { text: strings.common.cancel, style: 'cancel' },
        {
          text: strings.reader.menu.markRead,
          onPress: async () => {
            const n = await markTextAsKnown(content, vocab);
            await updateSource(id, { readAt: nowIso() });
            setVocabVersion((v) => v + 1);
            showSnackbar(strings.reader.markedRead(n));
          },
        },
      ]),
    rename: async (title: string) => {
      const clean = title.trim();
      if (!clean || !source) return;
      await updateSource(id, { title: clean });
      setSource({ ...source, title: clean });
      showSnackbar(strings.reader.titleSaved);
    },
  };
}

export type ReaderState = ReturnType<typeof useReader>;
