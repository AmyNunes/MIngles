import type { Token } from '@/lib/tokenize';

/** Um "átomo" é o que aparece junto na linha: palavra + pontuação grudada (ex.: "(decision)."). */
export type Atom = {
  text: string;
  /** Índice do token da palavra (null = só pontuação). */
  wordIndex: number | null;
};

/**
 * Agrupa os tokens [from, to) em átomos. A pontuação antes do espaço gruda na
 * palavra anterior; a pontuação depois do espaço gruda na próxima.
 */
export function atomsOf(tokens: Token[], from: number, to: number): Atom[] {
  const atoms: Atom[] = [];
  let prefix = '';
  for (let i = from; i < to; i++) {
    const t = tokens[i];
    if (t.isWord) {
      atoms.push({ text: prefix + t.text, wordIndex: i });
      prefix = '';
      continue;
    }
    const firstSpace = t.text.search(/\s/);
    if (firstSpace === -1) {
      // sem espaço: gruda na palavra anterior (ou vira prefixo, se ainda não há palavra)
      if (atoms.length && !prefix) atoms[atoms.length - 1].text += t.text;
      else prefix += t.text;
      continue;
    }
    const trailing = t.text.slice(0, firstSpace);
    const leading = t.text.slice(t.text.search(/\S*$/));
    if (trailing) {
      if (atoms.length) atoms[atoms.length - 1].text += trailing;
      else prefix += trailing;
    }
    prefix += leading;
  }
  if (prefix) {
    if (atoms.length) atoms[atoms.length - 1].text += prefix;
    else atoms.push({ text: prefix, wordIndex: null });
  }
  return atoms;
}
