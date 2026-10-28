import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { toAIError } from '@/ai/client';
import { markStepDone } from '@/db/activityRepo';
import { getJournalEntry, recentJournalEntries, saveJournalEntry, type JournalWithCorrection } from '@/db/productionRepo';
import { emitAppEvent } from '@/features/app/events';
import { wordCount } from '@/features/cards/lemma';
import { currentStudyDay } from '@/features/review/reviewService';
import { strings } from '@/i18n/strings';
import { showSnackbar } from '@/stores/snackbarStore';

import { runCorrection } from './correctionService';

/** Diário: uma entrada por dia, editável até o dia virar (seção 8.5). */
export function useJournal() {
  const day = currentStudyDay();
  const [text, setText] = useState('');
  const [previousWords, setPreviousWords] = useState(0);
  const [correctionId, setCorrectionId] = useState<string | null>(null);
  const [history, setHistory] = useState<JournalWithCorrection[]>([]);
  const [loading, setLoading] = useState(true);
  const [correcting, setCorrecting] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([getJournalEntry(day), recentJournalEntries(15)]).then(
      ([entry, recent]) => {
        if (!alive) return;
        if (entry) {
          setText(entry.original);
          setPreviousWords(entry.wordCount);
          setCorrectionId(entry.correctionId);
        }
        setHistory(recent.filter((e) => e.date !== day));
        setLoading(false);
      },
      () => alive && setLoading(false),
    );
    return () => {
      alive = false;
    };
  }, [day]);

  const correct = async () => {
    const content = text.trim();
    if (!content) {
      showSnackbar(strings.journal.empty);
      return;
    }
    setCorrecting(true);
    try {
      const { id } = await runCorrection({ text: content, mode: 'journal', origin: 'journal', originId: day, previousWords });
      const words = wordCount(content);
      await saveJournalEntry({ date: day, original: content, correctionId: id, wordCount: words });
      setPreviousWords(words);
      setCorrectionId(id);
      await markStepDone(day, 'journal');
      emitAppEvent('journalSaved');
      router.push(`/practice/correction/${id}`);
    } catch (error) {
      showSnackbar(toAIError(error).messagePt);
    } finally {
      setCorrecting(false);
    }
  };

  return { day, text, setText, words: wordCount(text), correctionId, history, loading, correcting, correct };
}
