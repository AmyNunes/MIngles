import { useEffect, useState } from 'react';

import { getCorrection, type Correction } from '@/db/correctionsRepo';
import { strings } from '@/i18n/strings';
import { haptics } from '@/lib/haptics';
import { showSnackbar } from '@/stores/snackbarStore';

import { saveCorrectionResults, type EditDecision } from './correctionService';
import { associateEdits, computeDiff, diffChanges } from './diff';
import { defaultSaveAsCard } from './errorCards';

/** Estado da Tela de correção (seção 8.5). */
export function useCorrection(id: string) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'notFound' | 'error'>('loading');
  const [correction, setCorrection] = useState<Correction | null>(null);
  const [decisions, setDecisions] = useState<EditDecision[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    getCorrection(id).then(
      (c) => {
        if (!alive) return;
        setCorrection(c);
        setDecisions((c?.edits ?? []).map((e) => ({ saveCard: defaultSaveAsCard(e), disputed: false })));
        setSaved(Boolean(c?.savedAt));
        setStatus(c ? 'ready' : 'notFound');
      },
      () => alive && setStatus('error'),
    );
    return () => {
      alive = false;
    };
  }, [id, attempt]);

  const changes = correction ? diffChanges(computeDiff(correction.original, correction.correctedText)) : [];
  const editOfChange = correction ? associateEdits(changes, correction.edits) : [];

  const setDecision = (i: number, patch: Partial<EditDecision>) =>
    setDecisions((prev) => prev.map((d, k) => (k === i ? { ...d, ...patch } : d)));

  const disputedChanges = new Set(
    changes.filter((_, k) => {
      const i = editOfChange[k];
      return i != null && decisions[i]?.disputed;
    }).map((c) => c.number),
  );

  return {
    status,
    retry: () => {
      setStatus('loading');
      setAttempt((a) => a + 1);
    },
    correction,
    changes,
    editOfChange,
    decisions,
    disputedChanges,
    saved,
    saving,
    cardsToCreate: decisions.filter((d) => d.saveCard && !d.disputed).length,
    toggleSaveCard: (i: number) => !saved && setDecision(i, { saveCard: !decisions[i]?.saveCard }),
    toggleDispute: (i: number) => {
      if (saved) return;
      const disputed = !decisions[i]?.disputed;
      haptics.light();
      setDecision(i, { disputed, saveCard: disputed ? false : decisions[i]?.saveCard });
      if (disputed) showSnackbar(strings.correction.disagreed);
    },
    save: async () => {
      if (!correction || saved || saving) return;
      setSaving(true);
      try {
        const n = await saveCorrectionResults(correction, decisions);
        setSaved(true);
        haptics.success();
        showSnackbar(strings.correction.saved(n));
      } catch {
        showSnackbar(strings.common.genericError);
      } finally {
        setSaving(false);
      }
    },
  };
}

export type CorrectionState = ReturnType<typeof useCorrection>;
