import type { RequiredItem } from '@/ai/schemas/production';

/** Formas irregulares comuns (para reconhecer "got used to" no item "get used to"). */
const IRREGULAR: Record<string, string[]> = {
  be: ['am', 'is', 'are', 'was', 'were', 'been', 'being', "i'm", "you're", "he's", "she's", "it's", "we're", "they're"],
  have: ['has', 'had', 'having', "i've", "we've", "they've", "you've"],
  do: ['does', 'did', 'done', 'doing'],
  go: ['goes', 'went', 'gone', 'going'],
  get: ['gets', 'got', 'gotten', 'getting'],
  make: ['makes', 'made', 'making'],
  take: ['takes', 'took', 'taken', 'taking'],
  come: ['comes', 'came', 'coming'],
  see: ['sees', 'saw', 'seen', 'seeing'],
  know: ['knows', 'knew', 'known', 'knowing'],
  think: ['thinks', 'thought', 'thinking'],
  say: ['says', 'said', 'saying'],
  tell: ['tells', 'told', 'telling'],
  give: ['gives', 'gave', 'given', 'giving'],
  find: ['finds', 'found', 'finding'],
  feel: ['feels', 'felt', 'feeling'],
  keep: ['keeps', 'kept', 'keeping'],
  leave: ['leaves', 'left', 'leaving'],
  bring: ['brings', 'brought', 'bringing'],
  buy: ['buys', 'bought', 'buying'],
  catch: ['catches', 'caught', 'catching'],
  teach: ['teaches', 'taught', 'teaching'],
  run: ['runs', 'ran', 'running'],
  write: ['writes', 'wrote', 'written', 'writing'],
  speak: ['speaks', 'spoke', 'spoken', 'speaking'],
  break: ['breaks', 'broke', 'broken', 'breaking'],
  begin: ['begins', 'began', 'begun', 'beginning'],
  hold: ['holds', 'held', 'holding'],
  stand: ['stands', 'stood', 'standing'],
  understand: ['understands', 'understood', 'understanding'],
  meet: ['meets', 'met', 'meeting'],
  pay: ['pays', 'paid', 'paying'],
  lose: ['loses', 'lost', 'losing'],
  spend: ['spends', 'spent', 'spending'],
  send: ['sends', 'sent', 'sending'],
  build: ['builds', 'built', 'building'],
  fall: ['falls', 'fell', 'fallen', 'falling'],
  become: ['becomes', 'became', 'becoming'],
  grow: ['grows', 'grew', 'grown', 'growing'],
  choose: ['chooses', 'chose', 'chosen', 'choosing'],
  forget: ['forgets', 'forgot', 'forgotten', 'forgetting'],
  drive: ['drives', 'drove', 'driven', 'driving'],
  eat: ['eats', 'ate', 'eaten', 'eating'],
  sleep: ['sleeps', 'slept', 'sleeping'],
  win: ['wins', 'won', 'winning'],
  sit: ['sits', 'sat', 'sitting'],
  hear: ['hears', 'heard', 'hearing'],
  mean: ['means', 'meant', 'meaning'],
  lead: ['leads', 'led', 'leading'],
  sell: ['sells', 'sold', 'selling'],
  throw: ['throws', 'threw', 'thrown', 'throwing'],
  deal: ['deals', 'dealt', 'dealing'],
  set: ['sets', 'setting'],
  put: ['puts', 'putting'],
  let: ['lets', 'letting'],
  cut: ['cuts', 'cutting'],
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Formas que contam como a mesma palavra (flexões regulares + irregulares). */
export function wordVariants(word: string): string[] {
  const w = word.toLowerCase();
  const forms = new Set([w, ...(IRREGULAR[w] ?? [])]);
  forms.add(`${w}s`);
  forms.add(`${w}es`);
  forms.add(`${w}ed`);
  forms.add(`${w}d`);
  forms.add(`${w}ing`);
  if (w.endsWith('e')) forms.add(`${w.slice(0, -1)}ing`);
  if (w.endsWith('y')) {
    forms.add(`${w.slice(0, -1)}ies`);
    forms.add(`${w.slice(0, -1)}ied`);
  }
  if (/[^aeiou][aeiou][bdgmnprt]$/.test(w)) {
    const last = w.at(-1);
    forms.add(`${w}${last}ing`);
    forms.add(`${w}${last}ed`);
  }
  return [...forms];
}

/** "algo", "alguém" e afins no item viram até 3 palavras quaisquer. */
const PLACEHOLDER = /^(something|someone|somebody|sth|sb|one's|someone's|smth|x)$/;

/** Expressão regular que encontra o termo no texto, aceitando flexões. */
export function termPattern(term: string): RegExp {
  const words = term
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}'’\s-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const WORD = "[\\p{L}\\p{N}'’-]+";
  const parts = words.map((w) =>
    PLACEHOLDER.test(w) ? `${WORD}(?:\\s+${WORD}){0,2}?` : `(?:${wordVariants(w).map(escape).join('|')})`,
  );
  return new RegExp(`(?<![\\p{L}\\p{N}])${parts.join('\\s+')}(?![\\p{L}\\p{N}])`, 'iu');
}

/**
 * Verificação local dos itens obrigatórios (sem IA, seção 8.5).
 * Termos: `true`/`false`. Estruturas e categorias: `null` (a IA confere na correção).
 */
export function checkRequiredItems(text: string, items: RequiredItem[]): (boolean | null)[] {
  const normalized = text.replace(/[’‘]/g, "'");
  return items.map((item) => (item.kind === 'term' ? termPattern(item.text).test(normalized) : null));
}
