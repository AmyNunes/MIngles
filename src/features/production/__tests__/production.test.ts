import type { Edit } from '@/ai/schemas/production';

import { associateEdits, computeDiff, diffChanges } from '../diff';
import { applyEdits, defaultSaveAsCard, errorNoteFrom } from '../errorCards';
import { checkRequiredItems, termPattern } from '../requiredItems';

const edit = (patch: Partial<Edit>): Edit => ({
  original: '',
  corrected: '',
  category: 'preposition',
  severity: 'error',
  explanationPt: '',
  exampleEn: '',
  ...patch,
});

describe('itens obrigatórios do desafio (verificação local)', () => {
  const items = [
    { text: 'get used to', kind: 'term' as const },
    { text: 'though', kind: 'term' as const },
    { text: 'present perfect', kind: 'structure' as const },
  ];

  it('marca o termo usado, aceitando flexões irregulares', () => {
    expect(checkRequiredItems('I finally got used to the cold, though.', items)).toEqual([true, true, null]);
  });

  it('não marca quando não usa', () => {
    expect(checkRequiredItems('I like the weather.', items)).toEqual([false, false, null]);
  });

  it('aceita flexões regulares e -ing', () => {
    expect(termPattern('look forward to').test("I'm looking forward to it")).toBe(true);
    expect(termPattern('carry on').test('She carried on working')).toBe(true);
    expect(termPattern('stop').test('He stopped')).toBe(true);
  });

  it('"something/someone" no item aceita palavras no meio', () => {
    expect(termPattern('remind someone of something').test('It reminds me of my mom')).toBe(true);
  });

  it('não confunde com pedaços de outras palavras', () => {
    expect(termPattern('though').test('I thought about it')).toBe(false);
  });
});

describe('diff e associação das explicações', () => {
  it('agrupa removido + adicionado numa alteração numerada', () => {
    const changes = diffChanges(computeDiff('It depends of you and me', 'It depends on you and me'));
    expect(changes).toEqual([{ number: 1, removed: 'of', added: 'on' }]);
  });

  it('associa cada alteração à explicação certa, mesmo fora de ordem', () => {
    const original = 'I has went to the school yesterday.';
    const corrected = 'I went to school yesterday.';
    const changes = diffChanges(computeDiff(original, corrected));
    const edits = [
      edit({ original: 'the school', corrected: 'school', category: 'article' }),
      edit({ original: 'has went', corrected: 'went', category: 'verb_tense' }),
    ];
    const assoc = associateEdits(changes, edits);
    expect(assoc).toHaveLength(changes.length);
    expect(edits[assoc[0] ?? 0].category).toBe('verb_tense');
    expect(edits[assoc[changes.length - 1] ?? 0].category).toBe('article');
  });
});

describe('cards de erro', () => {
  const text = 'Yesterday was great. It depends of the weather, I think.';

  it('frente = frase original; verso = a mesma frase só com esta correção', () => {
    const note = errorNoteFrom(text, edit({ original: 'depends of', corrected: 'depends on' }), 'Do diário');
    expect(note.kind).toBe('error');
    if (note.kind !== 'error') return;
    expect(note.data.original).toBe('It depends of the weather, I think.');
    expect(note.data.corrected).toBe('It depends on the weather, I think.');
  });

  it('erros de gravidade "Erro" vêm marcados; estilo não', () => {
    expect(defaultSaveAsCard(edit({ severity: 'error' }))).toBe(true);
    expect(defaultSaveAsCard(edit({ severity: 'style' }))).toBe(false);
  });

  it('aplica correções em sequência', () => {
    expect(applyEdits('a b c', [edit({ original: 'b', corrected: 'B' }), edit({ original: 'c', corrected: 'C' })])).toBe('a B C');
  });
});
