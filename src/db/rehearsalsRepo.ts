import { rehearsalPrepSchema, type RehearsalPrep } from '@/ai/schemas/rehearsal';
import { newId } from '@/lib/ids';
import { nowIso } from '@/lib/dates';
import { parseJsonWith } from '@/lib/json';

import { getDb } from './client';

export type Rehearsal = {
  id: string;
  title: string;
  eventAt: string;
  description: string;
  prep: RehearsalPrep | null;
  rehearsedAt: string | null;
  createdAt: string;
};

type Row = Omit<Rehearsal, 'prep'> & { prep: string | null };

const toRehearsal = (r: Row): Rehearsal => ({
  ...r,
  prep: parseJsonWith<RehearsalPrep | null>(r.prep, rehearsalPrepSchema, null),
});

export async function createRehearsal(r: { title: string; eventAt: string; description: string }): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    'INSERT INTO rehearsals (id, title, eventAt, description, prep, rehearsedAt, createdAt) VALUES (?, ?, ?, ?, NULL, NULL, ?)',
    id,
    r.title,
    r.eventAt,
    r.description,
    nowIso(),
  );
  return id;
}

export async function updateRehearsal(
  id: string,
  patch: Partial<Pick<Rehearsal, 'title' | 'eventAt' | 'description' | 'rehearsedAt'>> & { prep?: RehearsalPrep | null },
): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const params: (string | null)[] = [];
  for (const [k, v] of Object.entries(patch)) {
    sets.push(`${k} = ?`);
    params.push(k === 'prep' ? (v ? JSON.stringify(v) : null) : ((v as string | null) ?? null));
  }
  if (!sets.length) return;
  await db.runAsync(`UPDATE rehearsals SET ${sets.join(', ')} WHERE id = ?`, ...params, id);
}

export async function getRehearsal(id: string): Promise<Rehearsal | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>('SELECT * FROM rehearsals WHERE id = ?', id);
  return row ? toRehearsal(row) : null;
}

export async function listRehearsals(): Promise<Rehearsal[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>('SELECT * FROM rehearsals ORDER BY eventAt DESC');
  return rows.map(toRehearsal);
}

/** Próximos eventos (para as notificações e o cartão de Hoje). */
export async function upcomingRehearsals(fromIso: string, toIso: string): Promise<Rehearsal[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM rehearsals WHERE eventAt >= ? AND eventAt <= ? ORDER BY eventAt',
    fromIso,
    toIso,
  );
  return rows.map(toRehearsal);
}

export async function deleteRehearsal(id: string): Promise<Rehearsal | null> {
  const existing = await getRehearsal(id);
  const db = await getDb();
  await db.runAsync('DELETE FROM rehearsals WHERE id = ?', id);
  return existing;
}

export async function restoreRehearsal(r: Rehearsal): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR IGNORE INTO rehearsals (id, title, eventAt, description, prep, rehearsedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    r.id,
    r.title,
    r.eventAt,
    r.description,
    r.prep ? JSON.stringify(r.prep) : null,
    r.rehearsedAt,
    r.createdAt,
  );
}
