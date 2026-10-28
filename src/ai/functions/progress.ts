import { categoryLabel } from '@/features/errors/taxonomy';
import type { WeekStats } from '@/features/progress/stats';

import { callAI } from '../client';
import { loadUserContext, TEACHER, userContextBlock } from '../context';
import { avoidanceReportSchema, weeklySummarySchema, type AvoidanceReport } from '../schemas/progress';

/** Resumo semanal: os números são calculados no aparelho; a IA só escreve o texto. */
export async function weeklySummary(stats: WeekStats): Promise<{ summaryPt: string; focusNextWeekPt: string }> {
  const ctx = await loadUserContext();
  const { data } = await callAI(
    'weeklySummary',
    [
      {
        role: 'system',
        content: [
          TEACHER,
          userContextBlock(ctx),
          '',
          'Tarefa: escrever o resumo da semana de estudo, em português, tom gentil e sem culpa (nada de bronca por dias parados).',
          '- summaryPt: 2 a 3 frases sobre a semana, citando 1 ou 2 números.',
          '- focusNextWeekPt: 1 frase com um foco concreto para a próxima semana (ex.: uma categoria de erro).',
        ].join('\n'),
      },
      {
        role: 'user',
        content: JSON.stringify({
          ...stats,
          accuracy: Math.round(stats.accuracy * 100),
          topCategories: stats.topCategories.map((c) => `${categoryLabel(c.category)} (${c.n})`),
        }),
      },
    ],
    weeklySummarySchema,
    { temperature: 0.6 },
  );
  return data;
}

/** "Palavras que você evita": só a estatística local e algumas frases vão para a IA (seção 10.7). */
export async function avoidanceReport(input: {
  totalWords: number;
  counts: { word: string; count: number }[];
  sentences: string[];
}): Promise<AvoidanceReport> {
  const ctx = await loadUserContext();
  const { data } = await callAI(
    'avoidanceReport',
    [
      {
        role: 'system',
        content: [
          TEACHER,
          userContextBlock(ctx),
          '',
          'Tarefa: a partir da contagem de palavras e das frases de amostra do aluno, apontar:',
          '- overused: até 4 palavras usadas demais (word, count) com 3 alternativas em inglês cada (alternatives);',
          '- avoidedStructures: até 3 estruturas comuns no nível dele que ele quase não usa (structure, em inglês),',
          '  com explanationPt (1 frase) e example (1 frase em inglês).',
        ].join('\n'),
      },
      {
        role: 'user',
        content: `Total de palavras escritas: ${input.totalWords}\nContagens: ${input.counts.map((c) => `${c.word}=${c.count}`).join(', ')}\nFrases:\n${input.sentences.map((s) => `- ${s}`).join('\n')}`,
      },
    ],
    avoidanceReportSchema,
    { temperature: 0.4 },
  );
  return data;
}
