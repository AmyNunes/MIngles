import { correctText } from '@/ai/functions/production';
import type { CorrectionMode } from '@/ai/prompts/production';
import type { Edit, RequiredItem } from '@/ai/schemas/production';
import { addWordsWritten } from '@/db/activityRepo';
import { getCardsOfNote } from '@/db/cardsRepo';
import { insertCorrection, markCorrectionSaved, type Correction, type CorrectionOrigin } from '@/db/correctionsRepo';
import { insertErrors, setErrorCard } from '@/db/errorsRepo';
import { createNotesWithCards, updateNote } from '@/db/notesRepo';
import { emitAppEvent } from '@/features/app/events';
import { wordCount } from '@/features/cards/lemma';
import { currentStudyDay } from '@/features/review/reviewService';
import { strings } from '@/i18n/strings';
import { formatDayMonth } from '@/lib/dates';

import { errorNoteFrom } from './errorCards';

/** Corrige um texto com a IA e guarda a correção. Devolve o id da correção. */
export async function runCorrection(input: {
  text: string;
  mode: CorrectionMode;
  origin: CorrectionOrigin;
  originId: string | null;
  requiredItems?: RequiredItem[];
  /** Palavras já contadas antes (ao corrigir de novo o mesmo texto). */
  previousWords?: number;
}): Promise<{ id: string; correction: Omit<Correction, 'id' | 'createdAt' | 'savedAt'> }> {
  const result = await correctText({ text: input.text, mode: input.mode, requiredItems: input.requiredItems });
  const correction = {
    origin: input.origin,
    originId: input.originId,
    original: input.text.trim(),
    correctedText: result.correctedText || input.text.trim(),
    naturalVersion: result.naturalVersion,
    edits: result.edits,
    usedRequiredItems: result.usedRequiredItems,
  };
  const id = await insertCorrection(correction);
  const delta = wordCount(input.text) - (input.previousWords ?? 0);
  if (delta > 0) await addWordsWritten(currentStudyDay(), delta);
  return { id, correction };
}

export type EditDecision = { saveCard: boolean; disputed: boolean };

/**
 * "Salvar e criar N cards": os erros vão para o caderno (os com "Discordo"
 * ficam marcados como não-erro) e os escolhidos viram cards de Erro.
 */
export async function saveCorrectionResults(correction: Correction, decisions: EditDecision[]): Promise<number> {
  const label = `${strings.correction.sourceLabel[correction.origin]} · ${formatDayMonth(new Date())}`;
  const errorIds = await insertErrors(
    correction.edits.map((e: Edit, i) => ({
      correctionId: correction.id,
      original: e.original,
      corrected: e.corrected,
      category: e.category,
      severity: e.severity,
      explanationPt: e.explanationPt,
      disputed: decisions[i]?.disputed ?? false,
      cardId: null,
    })),
  );

  const toCard = correction.edits
    .map((edit, i) => ({ edit, i }))
    .filter(({ i }) => decisions[i]?.saveCard && !decisions[i]?.disputed);
  const noteIds = await createNotesWithCards(
    toCard.map(({ edit }) => ({ note: errorNoteFrom(correction.original, edit, label), cardTypes: ['error'] })),
  );

  for (let k = 0; k < noteIds.length; k++) {
    const errorId = errorIds[toCard[k].i];
    const [card] = await getCardsOfNote(noteIds[k]);
    if (card) await setErrorCard(errorId, card.id);
    const note = errorNoteFrom(correction.original, toCard[k].edit, label);
    if (note.kind === 'error') await updateNote(noteIds[k], { data: { ...note.data, errorId } });
  }

  await markCorrectionSaved(correction.id);
  emitAppEvent('cardsChanged');
  return noteIds.length;
}
