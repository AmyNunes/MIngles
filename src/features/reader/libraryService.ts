import { listSources, type Source } from '@/db/sourcesRepo';
import { splitParagraphs } from '@/lib/tokenize';

import { knownRatio } from './document';
import { loadVocabIndex } from './vocabService';

export type LibraryItem = Source & {
  /** 0–1 */
  knownRatio: number;
  /** 0–1 */
  progress: number;
};

/** Biblioteca com "% de palavras conhecidas" e progresso de leitura de cada texto. */
export async function loadLibrary(archived: boolean): Promise<LibraryItem[]> {
  const [sources, vocab] = await Promise.all([listSources(archived), loadVocabIndex()]);
  return sources.map((s) => {
    const paragraphs = splitParagraphs(s.content).length;
    const progress = s.readAt ? 1 : paragraphs > 1 ? Math.min(1, s.readingPosition / (paragraphs - 1)) : 0;
    return { ...s, knownRatio: knownRatio(s.content, vocab.known), progress };
  });
}

/** Título automático: a primeira linha, curta. */
export function titleFromText(text: string): string {
  const first = text.trim().split(/\n/)[0]?.trim() ?? '';
  const words = first.split(/\s+/).slice(0, 8).join(' ');
  return words.length < first.length ? `${words}…` : words;
}
