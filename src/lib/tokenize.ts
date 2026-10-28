export type Token = {
  text: string;
  /** Palavra (tocável) ou separador (espaço, pontuação). */
  isWord: boolean;
  start: number;
  end: number;
};

// Letras/números, com apóstrofo ou hífen no meio (don't, well-known, I'm).
const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

/** Divide um texto em palavras e separadores, preservando tudo (juntar devolve o original). */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const match of text.matchAll(WORD)) {
    const start = match.index ?? 0;
    if (start > last) tokens.push({ text: text.slice(last, start), isWord: false, start: last, end: start });
    tokens.push({ text: match[0], isWord: true, start, end: start + match[0].length });
    last = start + match[0].length;
  }
  if (last < text.length) tokens.push({ text: text.slice(last), isWord: false, start: last, end: text.length });
  return tokens;
}

/** Divide um texto em frases (para o Leitor). Mantém a pontuação final. */
export function splitSentences(paragraph: string): { text: string; start: number; end: number }[] {
  const out: { text: string; start: number; end: number }[] = [];
  const re = /[^.!?…]+(?:[.!?…]+["'”’)\]]*|$)/g;
  for (const m of paragraph.matchAll(re)) {
    const raw = m[0];
    const start = (m.index ?? 0) + (raw.length - raw.trimStart().length);
    const text = raw.trim();
    if (text) out.push({ text, start, end: start + text.length });
  }
  return out;
}

/** Divide em parágrafos (linhas em branco ou quebras simples). */
export function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Texto entre o primeiro e o último token selecionados (expressão contígua). */
export function selectionText(tokens: Token[], fromIndex: number, toIndex: number): string {
  const a = Math.min(fromIndex, toIndex);
  const b = Math.max(fromIndex, toIndex);
  const first = tokens[a];
  const last = tokens[b];
  if (!first || !last) return '';
  const full = tokens.map((t) => t.text).join('');
  return full.slice(first.start, last.end).trim();
}
