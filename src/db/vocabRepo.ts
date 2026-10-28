import { nowIso } from '@/lib/dates';

import { getDb } from './client';

export type VocabStatus = 'learning' | 'known' | 'ignored';

export async function allVocabStatus(): Promise<Map<string, VocabStatus>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ lemma: string; status: VocabStatus }>('SELECT lemma, status FROM vocab_status');
  return new Map(rows.map((r) => [r.lemma, r.status]));
}

export async function setVocabStatus(lemmas: string[], status: VocabStatus | null): Promise<void> {
  if (!lemmas.length) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const lemma of lemmas) {
      if (status == null) await db.runAsync('DELETE FROM vocab_status WHERE lemma = ?', lemma);
      else {
        await db.runAsync(
          'INSERT INTO vocab_status (lemma, status, updatedAt) VALUES (?, ?, ?) ON CONFLICT(lemma) DO UPDATE SET status = excluded.status, updatedAt = excluded.updatedAt',
          lemma,
          status,
          nowIso(),
        );
      }
    }
  });
}

export async function countKnownWords(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM vocab_status WHERE status = 'known'");
  return row?.n ?? 0;
}
