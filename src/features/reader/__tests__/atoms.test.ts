import { tokenize } from '@/lib/tokenize';

import { atomsOf } from '../atoms';

const atoms = (text: string) => {
  const tokens = tokenize(text);
  return atomsOf(tokens, 0, tokens.length).map((a) => a.text);
};

describe('átomos do leitor', () => {
  it('pontuação gruda na palavra certa', () => {
    expect(atoms('She said: "Hello, world." (Really?)')).toEqual(['She', 'said:', '"Hello,', 'world."', '(Really?)']);
  });

  it('cada átomo de palavra aponta para o token da palavra', () => {
    const tokens = tokenize('Hi, you.');
    const list = atomsOf(tokens, 0, tokens.length);
    expect(list.map((a) => (a.wordIndex == null ? null : tokens[a.wordIndex].text))).toEqual(['Hi', 'you']);
  });

  it('texto só com pontuação vira um átomo sem palavra', () => {
    expect(atoms('...')).toEqual(['...']);
  });
});
