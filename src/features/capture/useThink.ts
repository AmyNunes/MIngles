import { useState } from 'react';

import { toAIError } from '@/ai/client';
import { getCorrection, type Correction } from '@/db/correctionsRepo';
import { runCorrection, saveCorrectionResults } from '@/features/production/correctionService';
import { defaultSaveAsCard } from '@/features/production/errorCards';
import { strings } from '@/i18n/strings';
import { showSnackbar } from '@/stores/snackbarStore';

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'result'; correction: Correction; saved: boolean };

/** "Pense em inglês" (aberto pela notificação): escrevo uma frase e vejo a correção ali mesmo. */
export function useThink() {
  const [state, setState] = useState<State>({ status: 'idle' });
  const [saving, setSaving] = useState(false);

  const correct = async (text: string) => {
    setState({ status: 'loading' });
    try {
      const { id } = await runCorrection({ text, mode: 'think', origin: 'think', originId: null });
      const correction = await getCorrection(id);
      if (!correction) throw new Error('missing correction');
      setState({ status: 'result', correction, saved: false });
    } catch (error) {
      setState({ status: 'error', message: toAIError(error).messagePt });
    }
  };

  const saveErrors = async () => {
    if (state.status !== 'result' || state.saved) return;
    setSaving(true);
    try {
      const decisions = state.correction.edits.map((e) => ({ saveCard: defaultSaveAsCard(e), disputed: false }));
      const n = await saveCorrectionResults(state.correction, decisions);
      setState({ ...state, saved: true });
      showSnackbar(strings.correction.saved(n));
    } finally {
      setSaving(false);
    }
  };

  return { state, saving, correct, saveErrors, reset: () => setState({ status: 'idle' }) };
}

export type ThinkState = ReturnType<typeof useThink>;
