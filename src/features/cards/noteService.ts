import type { ExplainTermResult, HowDoISayResult } from '@/ai/schemas/cards';
import { deleteNote, findNotesByLemma, createNotesWithCards, updateNote, type NewNote } from '@/db/notesRepo';
import { emitAppEvent } from '@/features/app/events';
import { useSettings } from '@/stores/settingsStore';

import { cardTypesFor } from './cardTypes';
import { normalizeLemma, wordCount } from './lemma';
import type { CardType, Note, ProductionData, TermData } from './model';

export type NoteSource = { id: string | null; label: string };

/** Nota de termo a partir de `explainTerm`. Se não houver frase, usa o exemplo da IA. */
export function termNoteFrom(
  result: ExplainTermResult,
  input: { term: string; sentence?: string },
  source?: NoteSource,
): NewNote {
  const userSentence = input.sentence?.trim();
  const term = input.term.trim();
  const data: TermData = {
    sentence: userSentence || result.exampleEn,
    termInSentence: userSentence ? term : result.exampleTerm || term,
    meaningPt: result.meaningPt,
    explanationPt: result.explanationPt,
    ipa: result.ipa,
    partOfSpeech: result.partOfSpeech,
    exampleEn: result.exampleEn,
    examplePt: result.examplePt,
    register: result.register,
    isMultiword: result.isMultiword || wordCount(result.lemma) > 1,
    contexts: [],
  };
  return {
    kind: 'term',
    term,
    lemma: normalizeLemma(result.lemma || term),
    data,
    sourceId: source?.id ?? null,
    sourceLabel: source?.label ?? null,
  };
}

/** Uma nota de Produção por opção escolhida em "Como eu digo?". */
export function productionNotesFrom(pt: string, result: HowDoISayResult, selected: number[], source?: NoteSource): NewNote[] {
  return selected.map((i) => {
    const option = result.options[i];
    const data: ProductionData = {
      pt: pt.trim(),
      en: option.en,
      register: option.register,
      notePt: option.notePt,
      alternatives: result.options
        .filter((_, j) => j !== i)
        .map((o) => ({ en: o.en, register: o.register, notePt: o.notePt })),
    };
    return {
      kind: 'production',
      term: pt.trim(),
      lemma: normalizeLemma(option.en),
      data,
      sourceId: source?.id ?? null,
      sourceLabel: source?.label ?? null,
    };
  });
}

export function cardTypesForNew(note: NewNote): CardType[] {
  const { autoCloze, productionFromContext } = useSettings.getState().study;
  return cardTypesFor(note, { autoCloze, productionFromContext });
}

/** Procura uma nota já salva com o mesmo termo (lemma) e tipo. */
export async function findDuplicate(note: NewNote): Promise<Note | null> {
  const [first] = await findNotesByLemma(note.lemma, note.kind);
  return first ?? null;
}

export type SaveResult = {
  createdIds: string[];
  merged: { id: string; previous: Note['data'] }[];
};

/**
 * Salva as notas. Para cada uma, `mergeInto` (id de uma nota existente)
 * junta a nova frase à nota antiga em vez de criar outra.
 */
export async function saveNotes(items: { note: NewNote; mergeInto?: Note }[]): Promise<SaveResult> {
  const toCreate = items.filter((i) => !i.mergeInto);
  const createdIds = await createNotesWithCards(
    toCreate.map((i) => ({ note: i.note, cardTypes: cardTypesForNew(i.note) })),
  );

  const merged: SaveResult['merged'] = [];
  for (const { note, mergeInto } of items) {
    if (!mergeInto) continue;
    if (mergeInto.kind === 'term' && note.kind === 'term') {
      const sentence = (note.data as TermData).sentence;
      const known = [mergeInto.data.sentence, ...mergeInto.data.contexts];
      if (sentence && !known.includes(sentence)) {
        await updateNote(mergeInto.id, {
          data: { ...mergeInto.data, contexts: [...mergeInto.data.contexts, sentence] },
        });
      }
    }
    merged.push({ id: mergeInto.id, previous: mergeInto.data });
  }

  emitAppEvent('cardsChanged');
  return { createdIds, merged };
}

/** "Desfazer" depois de salvar: apaga o que foi criado e volta o que foi juntado. */
export async function undoSave(result: SaveResult): Promise<void> {
  for (const id of result.createdIds) await deleteNote(id);
  for (const m of result.merged) await updateNote(m.id, { data: m.previous });
  emitAppEvent('cardsChanged');
}
