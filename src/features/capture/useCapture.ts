import { useRef, useState } from 'react';

import { toAIError } from '@/ai/client';
import { explainTerm, howDoISay } from '@/ai/functions/cards';
import type { ExplainTermResult, HowDoISayResult } from '@/ai/schemas/cards';
import type { NewNote } from '@/db/notesRepo';
import type { CardType } from '@/features/cards/model';
import { cardTypesForNew, productionNotesFrom, termNoteFrom, type NoteSource } from '@/features/cards/noteService';
import { saveNotesInteractive } from '@/features/cards/saveInteractive';
import { strings } from '@/i18n/strings';
import { formatDayMonth } from '@/lib/dates';
import { showSnackbar } from '@/stores/snackbarStore';

const c = strings.capture;

export type CaptureResult =
  | { kind: 'howDoISay'; pt: string; data: HowDoISayResult; selected: number[] }
  | { kind: 'term'; term: string; sentence?: string; data: ExplainTermResult; note: NewNote; cardTypes: CardType[] };

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'result'; result: CaptureResult };

export function captureSource(): NoteSource {
  return { id: null, label: `${strings.cards.source.capture} · ${formatDayMonth(new Date())}` };
}

/** Estado da Captura rápida: pedir à IA, escolher opções e salvar como cards. */
export function useCapture(source: NoteSource = captureSource()) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const [saving, setSaving] = useState(false);
  const request = useRef(0);

  const run = async (task: () => Promise<CaptureResult>, retry: () => void) => {
    const id = ++request.current;
    setState({ status: 'loading' });
    try {
      const result = await task();
      if (id === request.current) setState({ status: 'result', result });
    } catch (error) {
      if (id === request.current) setState({ status: 'error', message: toAIError(error).messagePt, retry });
    }
  };

  const askHowDoISay = (pt: string) =>
    run(async () => {
      const data = await howDoISay({ pt });
      return { kind: 'howDoISay', pt, data, selected: [data.bestIndex] };
    }, () => void askHowDoISay(pt));

  const askTerm = (term: string, sentence?: string) =>
    run(async () => {
      const { data } = await explainTerm({ term, sentence });
      const note = termNoteFrom(data, { term, sentence }, source);
      return { kind: 'term', term, sentence, data, note, cardTypes: cardTypesForNew(note) };
    }, () => void askTerm(term, sentence));

  const toggleOption = (index: number) => {
    if (state.status !== 'result' || state.result.kind !== 'howDoISay') return;
    const { selected } = state.result;
    const next = selected.includes(index) ? selected.filter((i) => i !== index) : [...selected, index].sort();
    setState({ status: 'result', result: { ...state.result, selected: next } });
  };

  const reset = () => {
    request.current++;
    setState({ status: 'idle' });
  };

  /** Salva o resultado atual. Devolve `true` se salvou (para limpar o campo). */
  const save = async (): Promise<boolean> => {
    if (state.status !== 'result' || saving) return false;
    const { result } = state;
    const notes =
      result.kind === 'howDoISay'
        ? productionNotesFrom(result.pt, result.data, result.selected, source)
        : [result.note];
    if (!notes.length) {
      showSnackbar(c.chooseOne);
      return false;
    }

    setSaving(true);
    try {
      const saved = await saveNotesInteractive(notes);
      if (!saved) return false;
      reset();
      return true;
    } catch {
      showSnackbar(strings.common.genericError);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { state, saving, askHowDoISay, askTerm, toggleOption, save, reset };
}
