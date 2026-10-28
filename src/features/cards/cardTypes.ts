import { canMakeCloze } from './content';
import type { CardType, NoteContent } from './model';

export type CardGenerationSettings = {
  /** Gerar card de Lacuna automaticamente (para expressões de 2+ palavras). */
  autoCloze: boolean;
  /** Gerar card de Produção a partir de notas de Contexto. */
  productionFromContext: boolean;
};

/**
 * Quais cards uma nota gera (1 ou 2, seção 7.1/7.2).
 * Termo: Contexto + (Lacuna se for expressão e couber na frase; senão Produção, se ligado).
 */
export function cardTypesFor(note: NoteContent, settings: CardGenerationSettings): CardType[] {
  if (note.kind === 'production') return ['production'];
  if (note.kind === 'error') return ['error'];

  const types: CardType[] = ['context'];
  if (settings.autoCloze && note.data.isMultiword && canMakeCloze(note)) {
    types.push('cloze');
  } else if (settings.productionFromContext && note.data.examplePt && note.data.exampleEn) {
    types.push('production');
  }
  return types;
}
