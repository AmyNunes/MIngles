import { getProfile } from '@/db/profileRepo';
import { categoryLabel } from '@/features/errors/taxonomy';
import type { Profile } from '@/features/profile/schema';

export type UserContext = {
  profile: Profile;
  /** As 3 categorias de erro mais frequentes (códigos da taxonomia). */
  topErrorCategories: string[];
};

type TopErrorsProvider = () => Promise<string[]>;
let topErrorsProvider: TopErrorsProvider = async () => [];

/** O caderno de erros registra aqui como buscar as categorias mais frequentes. */
export function setTopErrorsProvider(provider: TopErrorsProvider): void {
  topErrorsProvider = provider;
}

export async function loadUserContext(): Promise<UserContext> {
  const [profile, topErrorCategories] = await Promise.all([
    getProfile(),
    topErrorsProvider().catch(() => []),
  ]);
  return { profile, topErrorCategories };
}

export const variantName = (p: Profile) => (p.variant === 'uk' ? 'britânico' : 'americano');

/**
 * Bloco "sobre o aluno" incluído em todo prompt de sistema (seção 10.3),
 * com as regras fixas dos prompts (seção 10.4).
 */
export function userContextBlock({ profile: p, topErrorCategories }: UserContext): string {
  const level =
    p.level == null || p.level === 'unknown'
      ? 'não informado (estime pelo que ele escreve)'
      : p.level;
  const lines = [
    'Sobre o aluno (brasileiro aprendendo inglês):',
    `- Nível estimado: ${level}`,
    p.goal && `- Objetivo: ${p.goal}`,
    p.interests.length > 0 && `- Interesses: ${p.interests.join(', ')}`,
    p.occupation && `- Profissão/contexto: ${p.occupation}`,
    `- Variante do inglês: ${variantName(p)}`,
    p.knownDifficulties && `- Dificuldades que ele já conhece: ${p.knownDifficulties}`,
    topErrorCategories.length > 0 &&
      `- Erros mais frequentes: ${topErrorCategories.map(categoryLabel).join(', ')}`,
    '',
    'Regras fixas:',
    '- Explicações em português do Brasil; exemplos em inglês ' + variantName(p) + '.',
    '- Compare com o português quando ajudar (falsos cognatos, tradução literal).',
    '- Respostas curtas e diretas: explicações com no máximo 2 frases, salvo pedido de "explicar mais".',
    '- Exemplos no nível i+1: um pouco acima do nível do aluno, nunca rebuscados sem motivo.',
  ];
  return lines.filter((l) => l !== false && l !== '').join('\n').replace('\nRegras', '\n\nRegras');
}

export const TEACHER = 'Você é um professor particular de inglês, paciente e direto.';
