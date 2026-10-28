import type { ConversationMessage } from '@/db/productionRepo';
import { ERROR_CATEGORY_CODES } from '@/features/errors/taxonomy';

import { TEACHER, userContextBlock, variantName, type UserContext } from '../context';
import type { RequiredItem } from '../schemas/production';
import type { ChatMessage } from '../types';

const CATEGORIES = ERROR_CATEGORY_CODES.filter((c) => c !== 'pronunciation').join(', ');

const MODES = {
  journal: 'uma entrada de diário',
  challenge: 'a resposta a um desafio de escrita',
  conversation: 'mensagens de uma conversa',
  think: 'uma frase curta do exercício "pense em inglês"',
} as const;

export type CorrectionMode = keyof typeof MODES;

const editRules = [
  '- edits: uma entrada por alteração, na ordem do texto:',
  '  original = o trecho EXATO como está no texto do aluno (copie, sem mudar nada);',
  '  corrected = como o trecho fica;',
  `  category = um destes códigos: ${CATEGORIES};`,
  '  severity = "error" (erro), "unnatural" (soa estranho) ou "style" (só sugestão de estilo);',
  '  explanationPt = 1 ou 2 frases em português, comparando com o português quando ajudar;',
  '  exampleEn = um exemplo correto curto e novo com a mesma estrutura.',
];

export function correctTextPrompt(
  ctx: UserContext,
  input: { text: string; mode: CorrectionMode; requiredItems?: RequiredItem[] },
): ChatMessage[] {
  const items = input.requiredItems?.length
    ? `\nItens obrigatórios do desafio: ${input.requiredItems.map((i) => `"${i.text}"`).join(', ')}.`
    : '';
  return [
    {
      role: 'system',
      content: [
        TEACHER,
        userContextBlock(ctx),
        '',
        `Tarefa: corrigir ${MODES[input.mode]} escrita pelo aluno em inglês.`,
        'Preserve o sentido e a voz dele. Corrija erros e o que soa estranho; estilo só como sugestão.',
        '- correctedText: o texto inteiro corrigido, mudando o mínimo necessário.',
        `- naturalVersion: como um nativo (${variantName(ctx.profile)}) escreveria, mantendo o sentido.`,
        ...editRules,
        '- usedRequiredItems: dos itens obrigatórios, os que o aluno usou corretamente (texto exato do item).',
        'Se o texto estiver perfeito: edits = [] e correctedText igual ao original.',
      ].join('\n'),
    },
    { role: 'user', content: `${input.text.trim()}${items}` },
  ];
}

export function dailyChallengePrompt(
  ctx: UserContext,
  input: { reviewingTerms: string[]; frequentCategories: string[]; avoidedStructures: string[] },
): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        TEACHER,
        userContextBlock(ctx),
        '',
        'Tarefa: criar o desafio de escrita do dia, curto (cerca de 5 minutos).',
        '- promptPt: o enunciado em português, uma frase (ex.: "Escreva 3 frases sobre seus planos para o fim de semana."). Use os interesses do aluno.',
        '- requiredItems: 2 ou 3 itens obrigatórios. kind = "term" para palavras/expressões (escolha entre as que ele está revisando),',
        '  "structure" para uma estrutura gramatical, "category" para treinar uma categoria de erro frequente.',
        '- exampleAnswer: uma resposta-modelo curta em inglês, usando os itens.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `Termos em revisão: ${input.reviewingTerms.join(', ') || '(nenhum ainda)'}`,
        `Categorias de erro frequentes: ${input.frequentCategories.join(', ') || '(nenhuma ainda)'}`,
        `Estruturas que ele evita: ${input.avoidedStructures.join(', ') || '(desconhecido)'}`,
      ].join('\n'),
    },
  ];
}

export function errorQuizPrompt(
  ctx: UserContext,
  errors: { original: string; corrected: string; category: string; explanationPt: string }[],
  count: number,
): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        TEACHER,
        userContextBlock(ctx),
        '',
        `Tarefa: criar ${count} questões curtas para treinar os erros reais do aluno (lista abaixo). Não repita as frases dele: crie frases novas com o mesmo problema.`,
        'Cada questão:',
        '- type: "multiple_choice" (escolha a forma correta), "find_error" (qual trecho está errado) ou "complete" (complete a lacuna);',
        '- promptEn: o enunciado em inglês (para "complete", use ____ na lacuna);',
        '- options: 3 ou 4 alternativas (obrigatório em multiple_choice e find_error; opcional em complete);',
        '- answer: a alternativa correta (texto idêntico a uma das options, quando houver);',
        '- explanationPt: 1 frase em português;',
        `- category: um destes códigos: ${CATEGORIES}.`,
        'Misture os tipos.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: errors
        .map((e, i) => `${i + 1}. "${e.original}" → "${e.corrected}" (${e.category}): ${e.explanationPt}`)
        .join('\n'),
    },
  ];
}

export function conversationTurnPrompt(
  ctx: UserContext,
  input: { topic: string; history: ConversationMessage[] },
): ChatMessage[] {
  const system = [
    'You are a friendly native English speaker chatting with a Brazilian learner.',
    userContextBlock(ctx),
    '',
    `Topic: ${input.topic}.`,
    "Reply in English at the learner's level (slightly above, i+1), 1–3 short sentences, and ALWAYS end with a question to keep the conversation going.",
    'Do not correct the learner inside replyEn. Put corrections ONLY in "corrections", and only for the learner\'s LAST message:',
    ...editRules,
    'If the last message has no errors, corrections = [].',
  ].join('\n');
  return [
    { role: 'system', content: system },
    ...input.history.map((m): ChatMessage => ({ role: m.role, content: m.text })),
  ];
}
