import { useState } from 'react';

import { toAIError } from '@/ai/client';
import { explainMore } from '@/ai/functions/cards';
import { updateNote } from '@/db/notesRepo';
import { showSnackbar } from '@/stores/snackbarStore';

import type { Note } from './model';

/** "Explicar mais (IA)": chama a IA e guarda o resultado na nota para as próximas vezes. */
export function useExplainMore(onUpdated: (note: Note) => void) {
  const [explaining, setExplaining] = useState(false);

  const run = async (note: Note) => {
    if (explaining) return;
    setExplaining(true);
    try {
      const extra = await explainMore(note);
      await updateNote(note.id, { extra });
      onUpdated({ ...note, extra });
    } catch (error) {
      showSnackbar(toAIError(error).messagePt);
    } finally {
      setExplaining(false);
    }
  };

  return { explaining, run };
}
