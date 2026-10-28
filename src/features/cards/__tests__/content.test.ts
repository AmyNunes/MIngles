import type { ExplainTermResult, HowDoISayResult } from '@/ai/schemas/cards';

import { cardTypesFor } from '../cardTypes';
import { buildCardContent, findTerm, markTerm, segmentsToText } from '../content';
import { normalizeLemma } from '../lemma';
import type { NoteContent, TermData } from '../model';
import { productionNotesFrom, termNoteFrom } from '../noteService';

const termData = (overrides: Partial<TermData> = {}): TermData => ({
  sentence: 'She finally came to terms with the decision.',
  termInSentence: 'came to terms with',
  meaningPt: 'aceitar',
  explanationPt: 'Aceitar algo difícil depois de um tempo.',
  ipa: 'kʌm tə tɜːrmz wɪð',
  partOfSpeech: 'expressão',
  exampleEn: 'It took him years to come to terms with it.',
  examplePt: 'Ele levou anos para aceitar isso.',
  register: 'neutral',
  isMultiword: true,
  contexts: [],
  ...overrides,
});

const termNote = (overrides: Partial<TermData> = {}): NoteContent => ({
  kind: 'term',
  term: 'come to terms with',
  lemma: 'come to terms with',
  data: termData(overrides),
});

describe('achar e marcar o termo', () => {
  it('acha o termo sem diferenciar maiúsculas, preferindo palavra inteira', () => {
    expect(findTerm('Catch the cat', 'cat')).toEqual({ start: 10, end: 13 });
  });

  it('marca o termo como realce ou lacuna', () => {
    const segments = markTerm('I came to terms with it.', ['came to terms with'], 'blank');
    expect(segments.map((s) => s.kind ?? 'text')).toEqual(['text', 'blank', 'text']);
    expect(segmentsToText(segments)).toBe('I ____ it.');
  });

  it('se não achar, devolve a frase inteira', () => {
    expect(markTerm('nada aqui', ['termo'], 'highlight')).toEqual([{ text: 'nada aqui' }]);
  });
});

describe('conteúdo dos cards', () => {
  it('Contexto: frase com termo realçado na frente, significado no verso', () => {
    const c = buildCardContent(termNote(), 'context');
    expect(c.front.main.find((s) => s.kind === 'highlight')?.text).toBe('came to terms with');
    expect(segmentsToText(c.back.main)).toBe('aceitar');
    expect(c.back.speak).toBe('come to terms with');
  });

  it('Lacuna: "____" + dica em PT na frente; frase completa no verso', () => {
    const c = buildCardContent(termNote(), 'cloze');
    expect(segmentsToText(c.front.main)).toContain('____');
    expect(c.front.hint).toBe('(aceitar)');
    expect(segmentsToText(c.back.main)).toBe('She finally came to terms with the decision.');
  });

  it('Produção: "Como você diria:" + PT; verso com a forma natural e alternativas', () => {
    const note: NoteContent = {
      kind: 'production',
      term: 'Estou morrendo de fome',
      lemma: "i'm starving",
      data: {
        pt: 'Estou morrendo de fome',
        en: "I'm starving",
        register: 'informal',
        notePt: 'Bem comum.',
        alternatives: [{ en: "I'm really hungry", register: 'neutral', notePt: '' }],
      },
    };
    const c = buildCardContent(note, 'production');
    expect(c.front.prompt).toBe('Como você diria:');
    expect(c.front.hint).toBe('informal');
    expect(segmentsToText(c.back.main)).toBe("I'm starving");
    expect(c.back.details[0]).toMatchObject({ text: "I'm really hungry", en: true });
  });

  it('Erro: frase original na frente; corrigida com diff e categoria no verso', () => {
    const note: NoteContent = {
      kind: 'error',
      term: 'It depends of you',
      lemma: 'it depends on you',
      data: {
        original: 'It depends of you',
        corrected: 'It depends on you',
        category: 'preposition',
        severity: 'error',
        explanationPt: '"Depend" pede "on".',
        exampleEn: 'It depends on the weather.',
        errorId: null,
      },
    };
    const c = buildCardContent(note, 'error');
    expect(c.front.prompt).toBe('Encontre e corrija:');
    expect(c.back.diff).toEqual({ original: 'It depends of you', corrected: 'It depends on you' });
    expect(c.back.chips).toContain('Preposição');
  });
});

describe('quais cards uma nota gera', () => {
  const settings = { autoCloze: true, productionFromContext: false };

  it('expressão de 2+ palavras: Contexto + Lacuna', () => {
    expect(cardTypesFor(termNote(), settings)).toEqual(['context', 'cloze']);
  });

  it('palavra única: só Contexto (ou + Produção, se ligado)', () => {
    const single = termNote({ isMultiword: false });
    expect(cardTypesFor(single, settings)).toEqual(['context']);
    expect(cardTypesFor(single, { autoCloze: true, productionFromContext: true })).toEqual(['context', 'production']);
  });

  it('nunca mais de 2 cards por nota', () => {
    expect(cardTypesFor(termNote(), { autoCloze: true, productionFromContext: true })).toHaveLength(2);
  });
});

describe('notas a partir da IA', () => {
  const explained: ExplainTermResult = {
    lemma: 'come to terms with',
    ipa: '',
    partOfSpeech: 'expressão',
    meaningPt: 'aceitar',
    explanationPt: '',
    exampleEn: 'It took years to come to terms with it.',
    examplePt: 'Levou anos para aceitar isso.',
    register: 'neutral',
    isMultiword: true,
    exampleTerm: 'come to terms with',
  };

  it('sem frase do usuário, usa o exemplo da IA como frase do card', () => {
    const note = termNoteFrom(explained, { term: 'come to terms with' });
    expect(note.kind).toBe('term');
    if (note.kind !== 'term') return;
    expect(note.data.sentence).toBe(explained.exampleEn);
    expect(note.lemma).toBe('come to terms with');
  });

  it('com frase do usuário, guarda o termo como aparece nela', () => {
    const note = termNoteFrom(explained, { term: 'came to terms with', sentence: 'She came to terms with it.' });
    if (note.kind !== 'term') throw new Error('kind');
    expect(note.data.sentence).toBe('She came to terms with it.');
    expect(note.data.termInSentence).toBe('came to terms with');
  });

  it('"Como eu digo?": uma nota por opção escolhida, com as outras como alternativas', () => {
    const result: HowDoISayResult = {
      options: [
        { en: "I'm starving", register: 'informal', notePt: '' },
        { en: "I'm very hungry", register: 'neutral', notePt: '' },
      ],
      bestIndex: 0,
    };
    const notes = productionNotesFrom('Estou com muita fome', result, [0, 1]);
    expect(notes).toHaveLength(2);
    if (notes[0].kind !== 'production') throw new Error('kind');
    expect(notes[0].data.alternatives.map((a) => a.en)).toEqual(["I'm very hungry"]);
  });

  it('normaliza o lema', () => {
    expect(normalizeLemma('  "Come to  Terms" ')).toBe('come to terms');
  });
});
