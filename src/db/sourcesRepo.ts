import { newId } from '@/lib/ids';
import { nowIso } from '@/lib/dates';

import { getDb } from './client';

export type SourceKind = 'paste' | 'manual' | 'share' | 'photo';

export type Source = {
  id: string;
  title: string;
  kind: SourceKind;
  content: string;
  url: string | null;
  createdAt: string;
  /** Índice do parágrafo onde parei (pode ter fração). */
  readingPosition: number;
  archived: boolean;
  lastReadAt: string | null;
  readAt: string | null;
};

type Row = Omit<Source, 'archived' | 'kind'> & { archived: number; kind: string };

const toSource = (r: Row): Source => ({
  ...r,
  kind: (['paste', 'manual', 'share', 'photo'] as const).find((k) => k === r.kind) ?? 'paste',
  archived: r.archived === 1,
});

const COLUMNS = 'id, title, kind, content, url, createdAt, readingPosition, archived, lastReadAt, readAt';

export async function createSource(input: { title: string; kind: SourceKind; content: string; url?: string | null }): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO sources (id, title, kind, content, url, createdAt, readingPosition, archived) VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
    id,
    input.title,
    input.kind,
    input.content,
    input.url ?? null,
    nowIso(),
  );
  return id;
}

export async function getSource(id: string): Promise<Source | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(`SELECT ${COLUMNS} FROM sources WHERE id = ?`, id);
  return row ? toSource(row) : null;
}

export async function listSources(archived: boolean): Promise<Source[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT ${COLUMNS} FROM sources WHERE archived = ? ORDER BY COALESCE(lastReadAt, createdAt) DESC`,
    archived ? 1 : 0,
  );
  return rows.map(toSource);
}

export async function updateSource(
  id: string,
  patch: Partial<Pick<Source, 'title' | 'readingPosition' | 'archived' | 'lastReadAt' | 'readAt'>>,
): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  for (const [key, value] of Object.entries(patch)) {
    sets.push(`${key} = ?`);
    params.push(typeof value === 'boolean' ? (value ? 1 : 0) : (value ?? null));
  }
  if (!sets.length) return;
  await db.runAsync(`UPDATE sources SET ${sets.join(', ')} WHERE id = ?`, ...params, id);
}

export async function deleteSources(ids: string[]): Promise<Source[]> {
  if (!ids.length) return [];
  const db = await getDb();
  const marks = ids.map(() => '?').join(',');
  const rows = await db.getAllAsync<Row>(`SELECT ${COLUMNS} FROM sources WHERE id IN (${marks})`, ...ids);
  await db.runAsync(`DELETE FROM sources WHERE id IN (${marks})`, ...ids);
  return rows.map(toSource);
}

/** Desfazer exclusão: recria os textos exatamente como estavam. */
export async function restoreSources(sources: Source[]): Promise<void> {
  const db = await getDb();
  for (const s of sources) {
    await db.runAsync(
      `INSERT OR IGNORE INTO sources (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      s.id,
      s.title,
      s.kind,
      s.content,
      s.url,
      s.createdAt,
      s.readingPosition,
      s.archived ? 1 : 0,
      s.lastReadAt,
      s.readAt,
    );
  }
}
