import { savedTermForms } from '@/db/notesRepo';
import { allVocabStatus, setVocabStatus } from '@/db/vocabRepo';
import { normalizeLemma } from '@/features/cards/lemma';

import { uniqueWords, type VocabIndex } from './document';

/** A partir de quantos dias de estabilidade (FSRS) uma palavra salva conta como "bem sabida". */
export const WELL_KNOWN_STABILITY_DAYS = 21;
const REVIEW_STATE = 2;

/** Monta o índice do realce: em aprendizado × conhecidas (seção 8.4). */
export async function loadVocabIndex(): Promise<VocabIndex> {
  const [forms, statuses] = await Promise.all([savedTermForms(), allVocabStatus()]);
  const learning = new Set<string>();
  const phrases = new Set<string>();
  const known = new Set<string>();

  for (const f of forms) {
    const wellKnown = f.maxStability >= WELL_KNOWN_STABILITY_DAYS && f.minState === REVIEW_STATE;
    for (const form of new Set([normalizeLemma(f.lemma), normalizeLemma(f.term)])) {
      if (!form) continue;
      if (form.includes(' ')) {
        if (!wellKnown) phrases.add(form);
      } else if (wellKnown) known.add(form);
      else learning.add(form);
    }
  }
  for (const [lemma, status] of statuses) {
    if (status === 'known') {
      known.add(lemma);
      learning.delete(lemma);
    }
  }
  return { learning, learningPhrases: [...phrases], known };
}

/** "Já conheço": a palavra deixa de contar como desconhecida. */
export async function markKnown(word: string): Promise<void> {
  await setVocabStatus([normalizeLemma(word)], 'known');
}

/** "Marcar como lido": as palavras do texto que não estou aprendendo passam a contar como conhecidas. */
export async function markTextAsKnown(content: string, vocab: VocabIndex): Promise<number> {
  const words = [...uniqueWords(content)].filter((w) => !vocab.learning.has(w) && !vocab.known.has(w));
  await setVocabStatus(words, 'known');
  return words.length;
}
