import { Alert } from 'react-native';

import type { NewNote } from '@/db/notesRepo';
import { strings } from '@/i18n/strings';
import { showSnackbar } from '@/stores/snackbarStore';

import type { Note } from './model';
import { findDuplicate, saveNotes, undoSave, type SaveResult } from './noteService';

const c = strings.capture;

function askDuplicate(term: string): Promise<'merge' | 'create' | 'cancel'> {
  return new Promise((resolve) =>
    Alert.alert(
      c.duplicateTitle,
      c.duplicateMessage(term),
      [
        { text: strings.common.cancel, style: 'cancel', onPress: () => resolve('cancel') },
        { text: c.createAnyway, onPress: () => resolve('create') },
        { text: c.merge, onPress: () => resolve('merge') },
      ],
      { cancelable: true, onDismiss: () => resolve('cancel') },
    ),
  );
}

/**
 * Salva notas perguntando o que fazer com duplicatas ("Juntar à existente" ou
 * "Criar mesmo assim", seção 7.5) e mostra o Snackbar com "Desfazer".
 * Devolve `null` se a pessoa cancelou.
 */
export async function saveNotesInteractive(notes: NewNote[]): Promise<SaveResult | null> {
  const items: { note: NewNote; mergeInto?: Note }[] = [];
  for (const note of notes) {
    const existing = await findDuplicate(note);
    if (!existing) {
      items.push({ note });
      continue;
    }
    const choice = await askDuplicate(note.kind === 'production' ? note.data.en : note.term);
    if (choice === 'cancel') return null;
    items.push(choice === 'merge' ? { note, mergeInto: existing } : { note });
  }
  const saved = await saveNotes(items);
  const message = saved.createdIds.length ? c.cardsSaved(saved.createdIds.length) : c.merged;
  showSnackbar(message, { label: strings.common.undo, onPress: () => void undoSave(saved) });
  return saved;
}
