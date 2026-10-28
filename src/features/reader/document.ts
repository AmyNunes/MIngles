import { normalizeLemma } from '@/features/cards/lemma';
import { splitParagraphs, splitSentences, tokenize, type Token } from '@/lib/tokenize';

export type ReaderParagraph = {
  index: number;
  text: string;
  tokens: Token[];
  sentences: { text: string; start: number; end: number }[];
  /** Para cada token, o índice da frase a que pertence. */
  sentenceOf: number[];
};

/** Prepara o texto para o leitor: parágrafos → frases → palavras. */
export function buildDocument(content: string): ReaderParagraph[] {
  return splitParagraphs(content).map((text, index) => {
    const tokens = tokenize(text);
    const sentences = splitSentences(text);
    const sentenceOf = tokens.map((t) => {
      const i = sentences.findIndex((s) => t.start >= s.start && t.start < s.end);
      return i === -1 ? Math.max(0, sentences.length - 1) : i;
    });
    return { index, text, tokens, sentences, sentenceOf };
  });
}

export type VocabIndex = {
  /** Formas de uma palavra que estou aprendendo (sublinhado pontilhado). */
  learning: Set<string>;
  /** Expressões de 2+ palavras que estou aprendendo. */
  learningPhrases: string[];
  /** Conheço (marquei "Já conheço" ou já sei bem). */
  known: Set<string>;
};

/** Índices dos tokens a realçar como "em aprendizado" (palavras e expressões). */
export function learningTokens(paragraph: ReaderParagraph, vocab: VocabIndex): Set<number> {
  const marked = new Set<number>();
  paragraph.tokens.forEach((t, i) => {
    if (t.isWord && vocab.learning.has(normalizeLemma(t.text))) marked.add(i);
  });
  if (vocab.learningPhrases.length) {
    const lower = paragraph.text.toLowerCase();
    for (const phrase of vocab.learningPhrases) {
      let from = 0;
      for (;;) {
        const at = lower.indexOf(phrase, from);
        if (at === -1) break;
        const end = at + phrase.length;
        paragraph.tokens.forEach((t, i) => {
          if (t.isWord && t.start >= at && t.end <= end) marked.add(i);
        });
        from = end;
      }
    }
  }
  return marked;
}

/** Palavras únicas do texto (normalizadas). */
export function uniqueWords(content: string): Set<string> {
  const words = new Set<string>();
  for (const t of tokenize(content)) {
    if (!t.isWord || /^\d+$/.test(t.text)) continue;
    words.add(normalizeLemma(t.text));
  }
  return words;
}

/** "% de palavras conhecidas" da biblioteca. */
export function knownRatio(content: string, known: Set<string>): number {
  const words = uniqueWords(content);
  if (!words.size) return 0;
  let k = 0;
  for (const w of words) if (known.has(w)) k++;
  return k / words.size;
}
