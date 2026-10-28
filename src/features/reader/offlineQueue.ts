import { AppState } from 'react-native';
import { z } from 'zod';

import { AIError } from '@/ai/client';
import { explainTerm } from '@/ai/functions/cards';
import { countAiQueue, enqueueAi, listAiQueue, removeFromAiQueue } from '@/db/aiQueueRepo';
import { registerAppService } from '@/features/app/useAppServices';
import { findDuplicate, saveNotes, termNoteFrom, type NoteSource } from '@/features/cards/noteService';
import { strings } from '@/i18n/strings';
import { showSnackbar } from '@/stores/snackbarStore';

const payloadSchema = z.object({
  term: z.string(),
  sentence: z.string().optional(),
  source: z.object({ id: z.string().nullable(), label: z.string() }).optional(),
});

/** "Sem conexão. Salvar para explicar depois?" */
export async function queueExplainLater(input: { term: string; sentence?: string; source?: NoteSource }): Promise<void> {
  await enqueueAi('explainTerm', input);
}

let running = false;

/** Processa a fila quando a conexão volta: explica cada termo e salva como card. */
export async function processAiQueue(): Promise<number> {
  if (running) return 0;
  running = true;
  let saved = 0;
  try {
    for (const item of await listAiQueue()) {
      const parsed = payloadSchema.safeParse(JSON.parse(item.payload));
      if (item.feature !== 'explainTerm' || !parsed.success) {
        await removeFromAiQueue(item.id);
        continue;
      }
      const { term, sentence, source } = parsed.data;
      try {
        const { data } = await explainTerm({ term, sentence });
        const note = termNoteFrom(data, { term, sentence }, source);
        const existing = await findDuplicate(note);
        await saveNotes([{ note, mergeInto: existing ?? undefined }]);
        await removeFromAiQueue(item.id);
        saved++;
      } catch (error) {
        // sem internet (ou IA indisponível): para e tenta de novo mais tarde
        if (error instanceof AIError && !['invalidResponse', 'badRequest'].includes(error.kind)) break;
        await removeFromAiQueue(item.id);
      }
    }
  } finally {
    running = false;
  }
  if (saved > 0) showSnackbar(strings.reader.queueProcessed(saved));
  return saved;
}

export { countAiQueue };

export function registerOfflineQueueService(): void {
  registerAppService(() => {
    void processAiQueue();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void processAiQueue();
    });
    return () => sub.remove();
  });
}
