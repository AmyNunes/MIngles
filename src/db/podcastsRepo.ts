import { podcastScriptSchema, type Podcast } from '@/ai/schemas/extras';
import { nowIso } from '@/lib/dates';
import { parseJsonWith } from '@/lib/json';

import { getDb } from './client';

export type PodcastEpisode = Podcast & { day: string; createdAt: string; listenedAt: string | null };

type Row = { day: string; title: string; script: string; createdAt: string; listenedAt: string | null };

function toEpisode(r: Row): PodcastEpisode {
  const script = parseJsonWith(r.script, podcastScriptSchema, { paragraphs: [], glossary: [] });
  return { day: r.day, title: r.title, ...script, createdAt: r.createdAt, listenedAt: r.listenedAt };
}

export async function getPodcast(day: string): Promise<PodcastEpisode | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>('SELECT * FROM podcasts WHERE day = ?', day);
  return row ? toEpisode(row) : null;
}

/** Guarda o episódio do dia (substitui o anterior, no "Gerar outro"). */
export async function savePodcast(day: string, p: Podcast): Promise<PodcastEpisode> {
  const db = await getDb();
  const createdAt = nowIso();
  await db.runAsync(
    `INSERT INTO podcasts (day, title, script, createdAt, listenedAt) VALUES (?, ?, ?, ?, NULL)
     ON CONFLICT(day) DO UPDATE SET title = excluded.title, script = excluded.script, createdAt = excluded.createdAt, listenedAt = NULL`,
    day,
    p.title,
    JSON.stringify({ paragraphs: p.paragraphs, glossary: p.glossary }),
    createdAt,
  );
  return { ...p, day, createdAt, listenedAt: null };
}

export async function markPodcastListened(day: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE podcasts SET listenedAt = ? WHERE day = ? AND listenedAt IS NULL', nowIso(), day);
}
