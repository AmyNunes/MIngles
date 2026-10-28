import { useEffect, useState } from 'react';

import { AIError, toAIError } from '@/ai/client';
import { dailyPodcast } from '@/ai/functions/extras';
import { recentStudyTerms } from '@/db/notesRepo';
import { getPodcast, savePodcast, type PodcastEpisode } from '@/db/podcastsRepo';
import { currentStudyDay } from '@/features/review/reviewService';

const TERMS_IN_EPISODE = 12;

export type PodcastState =
  | { status: 'loading' }
  | { status: 'ready'; episode: PodcastEpisode }
  | { status: 'error'; message: string; needsAi: boolean };

/** Episódio do dia: gerado uma vez por dia (na primeira abertura) e guardado. */
export function usePodcast() {
  const [state, setState] = useState<PodcastState>({ status: 'loading' });
  /** 0 = usa o guardado; >0 = "Gerar outro". */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const day = currentStudyDay();
      const existing = attempt === 0 ? await getPodcast(day) : null;
      if (existing) {
        if (alive) setState({ status: 'ready', episode: existing });
        return;
      }
      const episode = await savePodcast(day, await dailyPodcast(await recentStudyTerms(TERMS_IN_EPISODE)));
      if (alive) setState({ status: 'ready', episode });
    })().catch((e: unknown) => {
      if (alive) setState({ status: 'error', message: toAIError(e).messagePt, needsAi: e instanceof AIError && e.kind === 'notConfigured' });
    });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const regenerate = () => {
    setState({ status: 'loading' });
    setAttempt((a) => a + 1);
  };

  return { state, regenerate };
}
