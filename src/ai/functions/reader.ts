import { z } from 'zod';

import { peekCache, withCache } from '../cache';
import { callAI } from '../client';
import { loadUserContext, TEACHER, userContextBlock } from '../context';

export const translateSchema = z.object({ translationPt: z.string().min(1) });

const key = (text: string) => ({ text: text.trim() });

/** Traduz uma frase ou parágrafo em inglês para o português (com cache). */
export async function translate(text: string): Promise<string> {
  const { data } = await withCache('translate', key(text), translateSchema, async () => {
    const ctx = await loadUserContext();
    const result = await callAI(
      'translate',
      [
        {
          role: 'system',
          content: [
            TEACHER,
            userContextBlock(ctx),
            '',
            'Tarefa: traduzir o texto em inglês para um português do Brasil natural, fiel ao sentido.',
            'translationPt: só a tradução, sem comentários.',
          ].join('\n'),
        },
        { role: 'user', content: text.trim() },
      ],
      translateSchema,
      { temperature: 0.2 },
    );
    return result.data;
  });
  return data.translationPt;
}

/** Tradução já guardada (para o modo sem conexão). */
export async function cachedTranslation(text: string): Promise<string | null> {
  const hit = await peekCache('translate', key(text), translateSchema);
  return hit?.translationPt ?? null;
}
