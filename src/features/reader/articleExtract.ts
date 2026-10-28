/** Extrai o texto principal de uma página (artigo compartilhado pelo navegador). Puro, sem DOM. */

const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  copy: '©',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return NAMED[code.toLowerCase()] ?? m;
  });
}

const textOf = (html: string) =>
  decodeEntities(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();

/** Remove blocos que nunca são o artigo (scripts, menus, rodapés…). */
function stripNoise(html: string): string {
  let out = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of ['script', 'style', 'noscript', 'svg', 'nav', 'header', 'footer', 'aside', 'form', 'button', 'iframe', 'template']) {
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, 'gi'), ' ');
  }
  return out;
}

function findTitle(html: string): string {
  const og =
    html.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*property=["']og:title["']/i);
  if (og?.[1]) return textOf(og[1]);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title?.[1]) return textOf(title[1]);
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return h1?.[1] ? textOf(h1[1]) : '';
}

/** O maior <article>, senão <main>, senão <body>, senão tudo. */
function findScope(html: string): string {
  const articles = [...html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)].map((m) => m[1]);
  if (articles.length) return articles.reduce((a, b) => (b.length > a.length ? b : a));
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (main) return main[1];
  const body = html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i);
  return body ? body[1] : html;
}

const MIN_WORDS = 6;
const MAX_CHARS = 40_000;

export type ExtractedArticle = { title: string; text: string };

export function extractArticle(html: string): ExtractedArticle {
  const clean = stripNoise(html);
  const title = findTitle(html);
  const scope = findScope(clean);
  const blocks: string[] = [];
  let total = 0;
  for (const m of scope.matchAll(/<(h[1-3]|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const isHeading = m[1].toLowerCase().startsWith('h');
    const text = textOf(m[2]);
    if (!text) continue;
    if (!isHeading && text.split(' ').length < MIN_WORDS) continue;
    if (isHeading && text === title && blocks.length === 0) continue;
    if (blocks.at(-1) === text) continue;
    blocks.push(text);
    total += text.length;
    if (total > MAX_CHARS) break;
  }
  // Tira títulos soltos no fim (ex.: "Related articles").
  while (blocks.length && blocks.at(-1)!.split(' ').length < MIN_WORDS) blocks.pop();
  return { title, text: blocks.join('\n\n') };
}

/** Primeiro link http(s) de um texto compartilhado. */
export function findUrl(text: string): string | null {
  return text.match(/https?:\/\/[^\s<>"']+/i)?.[0]?.replace(/[).,;!?]+$/, '') ?? null;
}

/** O texto compartilhado é só um link (com no máximo um título curto junto)? */
export function isMostlyUrl(text: string): boolean {
  const url = findUrl(text);
  if (!url) return false;
  return text.replace(url, '').trim().split(/\s+/).filter(Boolean).length <= 15;
}
