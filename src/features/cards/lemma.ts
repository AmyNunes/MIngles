/**
 * Forma normalizada de um termo, usada para achar duplicatas e o status
 * das palavras no leitor: minúsculas, sem pontuação nas pontas, espaços simples.
 */
export function normalizeLemma(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[’‘`]/g, "'")
    .replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}
