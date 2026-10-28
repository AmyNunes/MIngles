import type { Note } from '@/features/cards/model';

import { TEACHER, userContextBlock, variantName, type UserContext } from '../context';
import type { ChatMessage } from '../types';

export function explainTermPrompt(
  ctx: UserContext,
  input: { term: string; sentence?: string },
): ChatMessage[] {
  const withSentence = Boolean(input.sentence?.trim());
  return [
    {
      role: 'system',
      content: [
        TEACHER,
        userContextBlock(ctx),
        '',
        `Tarefa: explicar o termo em inglês que o aluno quer aprender${withSentence ? ', no sentido em que aparece na frase dada' : ''}.`,
        'Campos:',
        '- lemma: forma de dicionário (ex.: "came to terms with" → "come to terms with").',
        `- ipa: transcrição IPA do lemma, pronúncia ${variantName(ctx.profile)}.`,
        '- partOfSpeech: classe gramatical em português (ex.: "verbo", "expressão", "substantivo").',
        '- meaningPt: significado em português NESTE contexto, curto (até 8 palavras).',
        '- explanationPt: até 2 frases em português, com nuance de uso.',
        '- exampleEn: um exemplo novo e natural em inglês, nível i+1, usando o termo.',
        '- examplePt: tradução natural do exemplo.',
        '- exampleTerm: o termo exatamente como aparece em exampleEn.',
        '- register: "neutral", "informal" ou "formal".',
        '- isMultiword: true se o lemma tiver 2 ou mais palavras.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: withSentence
        ? `Termo: ${input.term}\nFrase: ${input.sentence}`
        : `Termo: ${input.term}`,
    },
  ];
}

export function howDoISayPrompt(ctx: UserContext, input: { pt: string; context?: string }): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        TEACHER,
        userContextBlock(ctx),
        '',
        `Tarefa: o aluno escreve em português o que quer dizer. Dê de 2 a 3 formas naturais em inglês ${variantName(ctx.profile)}, como um nativo diria.`,
        'Cada opção:',
        '- en: a frase em inglês;',
        '- register: "neutral", "informal" ou "formal";',
        '- notePt: uma observação curta em português (quando usar, nuance). Máximo 1 frase.',
        'bestIndex: o índice (começando em 0) da opção mais natural para o dia a dia.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: input.context?.trim()
        ? `Quero dizer: ${input.pt}\nContexto: ${input.context}`
        : `Quero dizer: ${input.pt}`,
    },
  ];
}

function describeNote(note: Note): string {
  if (note.kind === 'term') {
    return `Termo: ${note.term} (${note.data.meaningPt})\nFrase: ${note.data.sentence}`;
  }
  if (note.kind === 'production') {
    return `Intenção em português: ${note.data.pt}\nForma em inglês: ${note.data.en}`;
  }
  return `Erro do aluno: "${note.data.original}" → correto: "${note.data.corrected}"\nExplicação: ${note.data.explanationPt}`;
}

export function explainMorePrompt(ctx: UserContext, note: Note): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        TEACHER,
        userContextBlock(ctx),
        '',
        'Tarefa: o aluno pediu para "explicar mais" este card. Aqui pode passar de 2 frases.',
        '- explanationPt: explicação mais completa, até 4 frases, em português.',
        '- extraExamples: 2 ou 3 exemplos novos em inglês (en) com tradução (pt).',
        '- commonMistakesPt: erros comuns de brasileiros com isso, em 1 ou 2 frases.',
      ].join('\n'),
    },
    { role: 'user', content: describeNote(note) },
  ];
}
