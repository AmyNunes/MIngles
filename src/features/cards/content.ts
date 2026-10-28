import { categoryLabel, SEVERITY_LABELS } from '@/features/errors/taxonomy';
import { strings } from '@/i18n/strings';

import type { CardType, NoteContent, Register, TermData } from './model';

/** Trecho de texto do card: normal, realçado (o termo) ou lacuna. */
export type Segment = { text: string; kind?: 'highlight' | 'blank' };

export type CardFront = {
  /** Linha pequena acima do conteúdo (ex.: "Como você diria:"). */
  prompt?: string;
  main: Segment[];
  hint?: string;
  /** Texto em inglês para ouvir. */
  speak?: string;
};

export type CardBackDetail = { text: string; en?: boolean; label?: string };

export type CardBack = {
  main: Segment[];
  ipa?: string;
  speak?: string;
  chips?: string[];
  details: CardBackDetail[];
  /** Cards de Erro: frase original × corrigida (para o diff). */
  diff?: { original: string; corrected: string };
};

export type CardContent = { type: CardType; front: CardFront; back: CardBack };

const c = strings.cards;

export function registerLabel(register: Register): string {
  return c.register[register];
}

/** Acha `term` dentro de `text` (sem diferenciar maiúsculas). Prefere palavra inteira. */
export function findTerm(text: string, term: string): { start: number; end: number } | null {
  const needle = term.trim();
  if (!needle) return null;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const whole = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu').exec(text);
  if (whole) return { start: whole.index, end: whole.index + whole[0].length };
  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  return index === -1 ? null : { start: index, end: index + needle.length };
}

/** Divide a frase em trechos, marcando o primeiro termo encontrado entre os candidatos. */
export function markTerm(text: string, candidates: string[], kind: 'highlight' | 'blank'): Segment[] {
  for (const candidate of candidates) {
    const hit = findTerm(text, candidate);
    if (hit) {
      return [
        { text: text.slice(0, hit.start) },
        { text: kind === 'blank' ? '____' : text.slice(hit.start, hit.end), kind },
        { text: text.slice(hit.end) },
      ].filter((s) => s.text !== '');
    }
  }
  return [{ text }];
}

export const plain = (text: string): Segment[] => [{ text }];

/** Candidatos para achar o termo numa frase: forma da frase, termo salvo, lema. */
function termCandidates(note: NoteContent): string[] {
  const fromData = note.kind === 'term' ? [note.data.termInSentence] : [];
  return [...fromData, note.term, note.lemma].filter(Boolean);
}

function termSentence(data: TermData): string {
  return data.sentence || data.exampleEn;
}

/** A frase do termo dá para virar Lacuna? (o termo precisa aparecer nela) */
export function canMakeCloze(note: NoteContent): boolean {
  if (note.kind !== 'term') return false;
  const sentence = termSentence(note.data);
  return termCandidates(note).some((t) => findTerm(sentence, t) != null);
}

/** Monta frente e verso de um card a partir da nota e do tipo. */
export function buildCardContent(note: NoteContent, type: CardType): CardContent {
  if (note.kind === 'term') {
    const d = note.data;
    const sentence = termSentence(d);
    const candidates = termCandidates(note);
    const meaningDetails: CardBackDetail[] = [
      d.explanationPt && { text: d.explanationPt },
      d.exampleEn && d.exampleEn !== sentence && { text: d.exampleEn, en: true },
      d.examplePt && d.exampleEn !== sentence && { text: d.examplePt },
    ].filter((x): x is CardBackDetail => Boolean(x));

    if (type === 'cloze') {
      return {
        type,
        front: { main: markTerm(sentence, candidates, 'blank'), hint: d.meaningPt ? `(${d.meaningPt})` : undefined },
        back: { main: markTerm(sentence, candidates, 'highlight'), speak: sentence, ipa: d.ipa, details: [] },
      };
    }

    if (type === 'production') {
      return {
        type,
        front: { prompt: c.howWouldYouSay, main: plain(d.examplePt || d.meaningPt) },
        back: {
          main: markTerm(d.exampleEn || sentence, candidates, 'highlight'),
          speak: d.exampleEn || sentence,
          details: [{ text: `${note.term} — ${d.meaningPt}` }],
        },
      };
    }

    return {
      type: 'context',
      front: { main: markTerm(sentence, candidates, 'highlight'), speak: sentence },
      back: {
        main: plain(d.meaningPt || note.term),
        ipa: d.ipa,
        speak: note.term,
        chips: d.partOfSpeech ? [d.partOfSpeech] : undefined,
        details: meaningDetails,
      },
    };
  }

  if (note.kind === 'production') {
    const d = note.data;
    return {
      type: 'production',
      front: {
        prompt: c.howWouldYouSay,
        main: plain(d.pt),
        hint: d.register !== 'neutral' ? registerLabel(d.register) : undefined,
      },
      back: {
        main: [{ text: d.en, kind: 'highlight' }],
        speak: d.en,
        details: [
          ...d.alternatives.map((a) => ({ text: a.en, en: true, label: registerLabel(a.register) })),
          ...(d.notePt ? [{ text: d.notePt }] : []),
        ],
      },
    };
  }

  const d = note.data;
  return {
    type: 'error',
    front: { prompt: c.findAndFix, main: plain(d.original) },
    back: {
      main: [{ text: d.corrected, kind: 'highlight' }],
      speak: d.corrected,
      chips: [categoryLabel(d.category), SEVERITY_LABELS[d.severity]],
      diff: { original: d.original, corrected: d.corrected },
      details: [
        ...(d.explanationPt ? [{ text: d.explanationPt }] : []),
        ...(d.exampleEn ? [{ text: d.exampleEn, en: true, label: c.correctExample }] : []),
      ],
    },
  };
}

/** Texto corrido de um conteúdo (para leitor de tela e buscas). */
export function segmentsToText(segments: Segment[]): string {
  return segments.map((s) => s.text).join('');
}
