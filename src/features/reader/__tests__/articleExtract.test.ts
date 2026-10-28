import { decodeEntities, extractArticle, findUrl, isMostlyUrl } from '../articleExtract';

const PAGE = `<!doctype html>
<html><head>
<title>Ignored &amp; fallback</title>
<meta property="og:title" content="How to Learn a Language &#8212; Slowly">
<style>p { color: red }</style>
<script>var p = "<p>not this one at all please ignore it</p>";</script>
</head>
<body>
<nav><ul><li>Home</li><li>About this site and other stuff here</li></ul></nav>
<header><p>Subscribe to our newsletter for daily updates and more news</p></header>
<article>
  <h1>How to Learn a Language — Slowly</h1>
  <p>Learning a language takes time, and that&rsquo;s perfectly fine for most people.</p>
  <p>Short one.</p>
  <h2>Read every day</h2>
  <p>Reading <a href="#">a little</a> every day<br>builds a habit that lasts for years.</p>
  <!-- <p>commented out paragraph that should never appear here</p> -->
  <h3>Related</h3>
</article>
<footer><p>Copyright 2026 the example company and all its partners</p></footer>
</body></html>`;

describe('extractArticle', () => {
  it('pega o título do og:title e só os parágrafos do artigo', () => {
    const { title, text } = extractArticle(PAGE);
    expect(title).toBe('How to Learn a Language — Slowly');
    expect(text).toBe(
      [
        'Learning a language takes time, and that’s perfectly fine for most people.',
        'Read every day',
        'Reading a little every day builds a habit that lasts for years.',
      ].join('\n\n'),
    );
  });

  it('sem <article>, usa o <body>', () => {
    const html = '<html><head><title>T</title></head><body><p>One two three four five six seven.</p></body></html>';
    expect(extractArticle(html)).toEqual({ title: 'T', text: 'One two three four five six seven.' });
  });

  it('página sem texto devolve texto vazio', () => {
    expect(extractArticle('<html><body><div>Login</div></body></html>').text).toBe('');
  });
});

describe('decodeEntities', () => {
  it('decodifica nomes, decimais e hexadecimais', () => {
    expect(decodeEntities('a &amp; b &#39;c&#x27; &nbsp;&hellip; &unknown;')).toBe("a & b 'c'  … &unknown;");
  });
});

describe('links compartilhados', () => {
  it('acha o link e tira a pontuação do fim', () => {
    expect(findUrl('Olha isso: https://example.com/a?b=1).')).toBe('https://example.com/a?b=1');
    expect(findUrl('sem link')).toBeNull();
  });

  it('distingue "só um link" de um texto com link no meio', () => {
    expect(isMostlyUrl('Great article https://example.com/post')).toBe(true);
    const long = `${'word '.repeat(40)} https://example.com`;
    expect(isMostlyUrl(long)).toBe(false);
    expect(isMostlyUrl('no link here')).toBe(false);
  });
});
