import { errorCountsSince } from '@/db/errorsRepo';
import { getChallenge, getJournalEntry } from '@/db/productionRepo';
import { getPodcast } from '@/db/podcastsRepo';
import { upcomingRehearsals } from '@/db/rehearsalsRepo';
import { listRecordings } from '@/db/speakingRepo';
import { monthKey } from '@/features/extras/speakingMetrics';
import { currentStudyDay } from '@/features/review/reviewService';
import { useLoader } from '@/lib/useLoader';

/** Dados do hub Praticar: status do desafio e do diário de hoje e o caderno de erros. */
export function usePracticeHub() {
  return useLoader(async () => {
    const day = currentStudyDay();
    const now = new Date();
    const [challenge, journal, notebook, upcoming, podcast, recordings] = await Promise.all([
      getChallenge(day),
      getJournalEntry(day),
      errorCountsSince('0000'),
      upcomingRehearsals(now.toISOString(), '9999'),
      getPodcast(day),
      listRecordings(),
    ]);
    const thisMonth = monthKey(now);
    return {
      challenge,
      journal,
      notebook,
      nextRehearsal: upcoming[0] ?? null,
      podcastListened: Boolean(podcast?.listenedAt),
      recordedThisMonth: recordings.find((r) => r.month === thisMonth) ?? null,
    };
  });
}
