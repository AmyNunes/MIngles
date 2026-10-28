import { router } from 'expo-router';

import { strings } from '@/i18n/strings';
import { useSourceDraft } from '@/stores/draftStore';
import { showSnackbar } from '@/stores/snackbarStore';

import { extractArticle, findUrl, isMostlyUrl, type ExtractedArticle } from './articleExtract';

const FETCH_TIMEOUT_MS = 15_000;
/** Menos que isso não é um artigo (provavelmente login, paywall ou página só com vídeo). */
const MIN_ARTICLE_CHARS = 200;

/** Baixa a página e tenta extrair o artigo. `null` se falhar. */
export async function fetchArticle(url: string): Promise<ExtractedArticle | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) Mobile' },
    });
    if (!res.ok) return null;
    const article = extractArticle(await res.text());
    return article.text.length >= MIN_ARTICLE_CHARS ? article : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Texto ou link vindo do "Compartilhar" (ou de um link copiado): abre "Novo texto" já preenchido.
 * Link: baixa a página e extrai o artigo; se não der, abre com o link e um aviso para colar o texto.
 */
export async function openSharedContent(shared: { text?: string | null; webUrl?: string | null; title?: string }): Promise<void> {
  const text = shared.text?.trim() ?? '';
  const url = shared.webUrl ?? findUrl(text);
  const draft = useSourceDraft.getState();

  if (text && (!url || !isMostlyUrl(text))) {
    draft.set({ text, kind: 'share', url, title: shared.title });
    router.push('/library/new');
    return;
  }
  if (!url) return;

  showSnackbar(strings.share.fetching);
  const article = await fetchArticle(url);
  if (article) {
    draft.set({ text: article.text, kind: 'share', url, title: article.title || shared.title });
  } else {
    draft.set({ text: '', kind: 'share', url, title: shared.title });
    showSnackbar(strings.share.linkOnly);
  }
  router.push('/library/new');
}
