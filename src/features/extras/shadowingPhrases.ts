import { randomNotes } from '@/db/notesRepo';
import type { Note } from '@/features/cards/model';

/** Frases boas para repetir em voz alta: nem curtas demais, nem longas demais. */
const MIN_WORDS = 3;
const MAX_WORDS = 18;
export const SHADOWING_SESSION_SIZE = 8;

/** Frases de partida, para quando ainda há poucos cards. */
const STARTER_PHRASES = [
  "I'm running a bit late, sorry about that.",
  'Could you say that again, please?',
  "I'd rather stay home tonight.",
  'It depends on how much time we have.',
  "I've been meaning to tell you something.",
  "Let's keep in touch.",
  "That's exactly what I was thinking.",
  'Would you mind closing the window?',
];

/** A frase em inglês de uma nota (a do contexto, a forma natural ou a corrigida). */
export function phraseOf(note: Note): string | null {
  const text =
    note.kind === 'term'
      ? note.data.sentence || note.data.exampleEn
      : note.kind === 'production'
        ? note.data.en
        : note.data.corrected;
  const clean = text.trim().replace(/\s+/g, ' ');
  const words = clean.split(' ').length;
  return words >= MIN_WORDS && words <= MAX_WORDS ? clean : null;
}

/** Frases das minhas notas (sorteadas), completadas com as de partida. */
export function pickPhrases(notes: Note[], size = SHADOWING_SESSION_SIZE): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const phrase of [...notes.map(phraseOf), ...STARTER_PHRASES]) {
    if (!phrase || seen.has(phrase.toLowerCase())) continue;
    seen.add(phrase.toLowerCase());
    out.push(phrase);
    if (out.length === size) break;
  }
  return out;
}

export async function loadShadowingPhrases(): Promise<string[]> {
  return pickPhrases(await randomNotes(40));
}
