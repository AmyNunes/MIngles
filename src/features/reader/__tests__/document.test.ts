import { buildDocument, knownRatio, learningTokens, uniqueWords, type VocabIndex } from '../document';

const vocab = (patch: Partial<VocabIndex> = {}): VocabIndex => ({
  learning: new Set(),
  learningPhrases: [],
  known: new Set(),
  ...patch,
});

describe('documento do leitor', () => {
  it('divide em parágrafos, frases e palavras, e sabe a frase de cada palavra', () => {
    const [p1, p2] = buildDocument('Hi there. How are you?\n\nSecond paragraph here.');
    expect(p1.sentences.map((s) => s.text)).toEqual(['Hi there.', 'How are you?']);
    const how = p1.tokens.findIndex((t) => t.text === 'How');
    expect(p1.sentenceOf[how]).toBe(1);
    expect(p2.index).toBe(1);
  });

  it('realça palavras e expressões em aprendizado', () => {
    const [p] = buildDocument('She came to terms with the Decision.');
    const marked = learningTokens(p, vocab({ learning: new Set(['decision']), learningPhrases: ['came to terms with'] }));
    const words = [...marked].map((i) => p.tokens[i].text);
    expect(words).toEqual(expect.arrayContaining(['came', 'to', 'terms', 'with', 'Decision']));
    expect(words).not.toContain('She');
  });

  it('palavras únicas ignoram maiúsculas e números', () => {
    expect([...uniqueWords('The cat and THE dog, 42 times.')].sort()).toEqual(['and', 'cat', 'dog', 'the', 'times']);
  });

  it('% de palavras conhecidas', () => {
    expect(knownRatio('the cat the dog', new Set(['the', 'cat']))).toBeCloseTo(2 / 3);
    expect(knownRatio('', new Set())).toBe(0);
  });
});
