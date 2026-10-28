import { callAI } from '../client';
import { loadUserContext, TEACHER, userContextBlock, variantName } from '../context';
import { rehearsalPrepSchema, type RehearsalPrep } from '../schemas/rehearsal';

/** Ensaio de situação: vocabulário útil, 3 frases-chave e a abertura de um roleplay. */
export async function rehearsalPrep(situation: { title: string; description: string }): Promise<RehearsalPrep> {
  const ctx = await loadUserContext();
  const { data } = await callAI(
    'rehearsalPrep',
    [
      {
        role: 'system',
        content: [
          TEACHER,
          userContextBlock(ctx),
          '',
          'Tarefa: preparar o aluno para uma situação real em inglês que vai acontecer em breve.',
          `- vocab: 6 a 8 palavras/expressões úteis (en, em inglês ${variantName(ctx.profile)}), com tradução (pt) e uma nota curta de uso (note, em português).`,
          '- keyPhrases: exatamente 3 frases-chave prontas para usar na situação, em inglês.',
          '- roleplayOpening: a primeira fala da outra pessoa no roleplay, em inglês, que puxe a conversa (termine com uma pergunta).',
        ].join('\n'),
      },
      { role: 'user', content: `Situação: ${situation.title}\nDetalhes: ${situation.description || '(sem detalhes)'}` },
    ],
    rehearsalPrepSchema,
    { temperature: 0.6 },
  );
  return { ...data, keyPhrases: data.keyPhrases.slice(0, 3) };
}
