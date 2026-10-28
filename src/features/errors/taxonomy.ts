/** Taxonomia de erros (seção 10.6): código → rótulo na interface. */
export const ERROR_CATEGORIES = {
  preposition: 'Preposição',
  verb_tense: 'Tempo verbal',
  article: 'Artigo',
  word_order: 'Ordem das palavras',
  false_friend: 'Falso cognato',
  agreement: 'Concordância',
  collocation: 'Combinação de palavras',
  word_choice: 'Escolha de palavra',
  literal_translation: 'Tradução literal',
  missing_word: 'Palavra faltando',
  extra_word: 'Palavra sobrando',
  spelling: 'Ortografia',
  punctuation: 'Pontuação',
  register: 'Formalidade',
  pronunciation: 'Pronúncia',
} as const;

export type ErrorCategory = keyof typeof ERROR_CATEGORIES;

export const ERROR_CATEGORY_CODES = Object.keys(ERROR_CATEGORIES) as [ErrorCategory, ...ErrorCategory[]];

export const SEVERITIES = ['error', 'unnatural', 'style'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_LABELS: Record<Severity, string> = {
  error: 'Erro',
  unnatural: 'Soa estranho',
  style: 'Estilo',
};

export function categoryLabel(code: string): string {
  return code in ERROR_CATEGORIES ? ERROR_CATEGORIES[code as ErrorCategory] : code;
}
