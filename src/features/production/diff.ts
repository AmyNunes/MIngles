import { diffWords } from 'diff';

export type DiffPart = {
  text: string;
  type: 'same' | 'removed' | 'added';
  /** Número da alteração (1, 2, 3…) ou null para texto igual. */
  change: number | null;
  /** Primeiro trecho da alteração (onde aparece o número). */
  first: boolean;
};

/**
 * Diff palavra a palavra calculado no aparelho (seção 10.5).
 * Trechos removidos/adicionados vizinhos formam uma única alteração numerada.
 */
export function computeDiff(original: string, corrected: string): DiffPart[] {
  const parts: DiffPart[] = [];
  let change = 0;
  let lastWasChange = false;
  for (const p of diffWords(original, corrected)) {
    const type = p.added ? 'added' : p.removed ? 'removed' : 'same';
    if (type === 'same') {
      lastWasChange = false;
      parts.push({ text: p.value, type, change: null, first: false });
    } else {
      const first = !lastWasChange;
      if (first) change++;
      lastWasChange = true;
      parts.push({ text: p.value, type, change, first });
    }
  }
  return parts;
}

export type DiffChange = { number: number; removed: string; added: string };

/** Agrupa as partes do diff em alterações ("antes → depois"). */
export function diffChanges(parts: DiffPart[]): DiffChange[] {
  const changes = new Map<number, DiffChange>();
  for (const p of parts) {
    if (p.change == null) continue;
    const c = changes.get(p.change) ?? { number: p.change, removed: '', added: '' };
    if (p.type === 'removed') c.removed += p.text;
    else c.added += p.text;
    changes.set(p.change, c);
  }
  return [...changes.values()];
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();

const overlaps = (a: string, b: string) => {
  const x = norm(a);
  const y = norm(b);
  return x.length > 0 && y.length > 0 && (x.includes(y) || y.includes(x));
};

/**
 * Associa cada alteração do diff a uma explicação da IA (`edits`), pelo texto
 * removido/adicionado; o que sobrar vai na ordem.
 */
export function associateEdits(
  changes: DiffChange[],
  edits: { original: string; corrected: string }[],
): (number | null)[] {
  const used = new Set<number>();
  const result = changes.map((change) => {
    let best = -1;
    let bestScore = 0;
    edits.forEach((edit, i) => {
      if (used.has(i)) return;
      const score =
        (change.removed && overlaps(change.removed, edit.original) ? 2 : 0) +
        (change.added && overlaps(change.added, edit.corrected) ? 2 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best >= 0) used.add(best);
    return best >= 0 ? best : null;
  });
  // alterações sem par: pega a próxima explicação livre, na ordem
  return result.map((r) => {
    if (r != null) return r;
    const free = edits.findIndex((_, i) => !used.has(i));
    if (free === -1) return null;
    used.add(free);
    return free;
  });
}
