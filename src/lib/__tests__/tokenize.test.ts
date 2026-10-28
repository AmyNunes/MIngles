import { selectionText, splitParagraphs, splitSentences, tokenize } from '../tokenize';

describe('tokenize (leitor e "Frase que vi")', () => {
  it('separa palavras e pontuação sem perder nada', () => {
    const text = "She finally came to terms with it, didn't she?";
    const tokens = tokenize(text);
    expect(tokens.map((t) => t.text).join('')).toBe(text);
    expect(tokens.filter((t) => t.isWord).map((t) => t.text)).toEqual([
      'She',
      'finally',
      'came',
      'to',
      'terms',
      'with',
      'it',
      "didn't",
      'she',
    ]);
  });

  it('mantém hífen e apóstrofo curvo dentro da palavra', () => {
    const words = tokenize('A well-known chef’s secret').filter((t) => t.isWord).map((t) => t.text);
    expect(words).toEqual(['A', 'well-known', 'chef’s', 'secret']);
  });

  it('acentos e números contam como palavra', () => {
    const words = tokenize('Café at 9am').filter((t) => t.isWord).map((t) => t.text);
    expect(words).toEqual(['Café', 'at', '9am']);
  });

  it('seleção contígua devolve a expressão exata', () => {
    const tokens = tokenize('She came to terms with the decision.');
    const came = tokens.findIndex((t) => t.text === 'came');
    const withIdx = tokens.findIndex((t) => t.text === 'with');
    expect(selectionText(tokens, withIdx, came)).toBe('came to terms with');
  });
});

describe('frases e parágrafos', () => {
  it('divide frases mantendo a pontuação', () => {
    expect(splitSentences('Hi there! How are you? Fine.').map((s) => s.text)).toEqual([
      'Hi there!',
      'How are you?',
      'Fine.',
    ]);
  });

  it('última frase sem ponto também conta', () => {
    expect(splitSentences('First one. And the rest').map((s) => s.text)).toEqual(['First one.', 'And the rest']);
  });

  it('divide parágrafos por linhas', () => {
    expect(splitParagraphs('Um.\n\nDois.\nTrês.\r\n')).toEqual(['Um.', 'Dois.', 'Três.']);
  });
});
