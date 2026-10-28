import type { Edit } from '@/ai/schemas/production';
import type { NewNote } from '@/db/notesRepo';
import { normalizeLemma } from '@/features/cards/lemma';
import { splitSentences } from '@/lib/tokenize';

/**
 * Card de Erro (seção 7.2): frente = minha frase original (sem marcações);
 * verso = a frase com só esta alteração aplicada.
 */
export function errorNoteFrom(text: string, edit: Edit, sourceLabel: string): NewNote {
  const sentence = edit.original ? splitSentences(text).find((s) => s.text.includes(edit.original)) : undefined;
  const original = sentence ? sentence.text : edit.original || text;
  const corrected = sentence ? sentence.text.replace(edit.original, edit.corrected) : edit.corrected;
  return {
    kind: 'error',
    term: original,
    lemma: normalizeLemma(corrected),
    data: {
      original,
      corrected,
      category: edit.category,
      severity: edit.severity,
      explanationPt: edit.explanationPt,
      exampleEn: edit.exampleEn,
      errorId: null,
    },
    sourceId: null,
    sourceLabel,
  };
}

/** Aplica as correções em sequência (para montar o texto corrigido da conversa). */
export function applyEdits(text: string, edits: Edit[]): string {
  let out = text;
  for (const e of edits) if (e.original && out.includes(e.original)) out = out.replace(e.original, e.corrected);
  return out;
}

/** Por padrão, gravidade "Erro" vira card; "Estilo" não (seção 8.5). */
export const defaultSaveAsCard = (edit: Edit) => edit.severity === 'error';
