import { callAI } from '../client';
import { loadUserContext, TEACHER, userContextBlock, variantName } from '../context';
import { photoTextSchema, podcastSchema, type PhotoText, type Podcast } from '../schemas/extras';

/** Podcast do dia: um episódio curto com os termos que estou estudando e os meus interesses. */
export async function dailyPodcast(terms: string[]): Promise<Podcast> {
  const ctx = await loadUserContext();
  const { data } = await callAI(
    'podcast',
    [
      {
        role: 'system',
        content: [
          TEACHER,
          userContextBlock(ctx),
          '',
          'Tarefa: escrever o roteiro de um podcast curto (2 a 3 minutos de leitura) para o aluno ouvir.',
          `- Em inglês ${variantName(ctx.profile)}, no nível do aluno, em tom de conversa, como um apresentador falando com um ouvinte.`,
          '- Tema: algo ligado aos interesses do aluno. Use naturalmente o máximo possível dos termos em estudo.',
          '- title: título curto do episódio, em inglês.',
          '- paragraphs: 4 a 6 parágrafos curtos (2 a 4 frases cada), sem marcações e sem emojis.',
          '- glossary: os termos em estudo que você usou, com a tradução (pt) no sentido do episódio.',
        ].join('\n'),
      },
      { role: 'user', content: terms.length ? `Termos em estudo: ${terms.join(', ')}` : 'Ainda não há termos em estudo.' },
    ],
    podcastSchema,
    { temperature: 0.8 },
  );
  return data;
}

/** Foto de uma página → texto em inglês para o Leitor (precisa de um modelo com visão). */
export async function photoToText(imageDataUrl: string): Promise<PhotoText> {
  const { data } = await callAI(
    'photoToText',
    [
      {
        role: 'system',
        content: [
          'Você transcreve fotos de páginas (livros, revistas, telas) para o aluno ler no app.',
          '- text: o texto em inglês da foto, exatamente como está, com uma linha em branco entre parágrafos. Junte palavras hifenizadas na quebra de linha. Ignore cabeçalhos, números de página e rodapés.',
          '- title: um título curto (o da página, se houver; senão, as primeiras palavras).',
          '- Se não houver texto em inglês legível, devolva text vazio.',
        ].join('\n'),
      },
      { role: 'user', content: 'Transcreva a página da foto.' },
    ],
    photoTextSchema,
    { temperature: 0, imageDataUrl, maxTokens: 4000 },
  );
  return data;
}
