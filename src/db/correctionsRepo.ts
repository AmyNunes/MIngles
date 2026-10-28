import { z } from 'zod';

import { editSchema, type Edit } from '@/ai/schemas/production';
import { newId } from '@/lib/ids';
import { nowIso } from '@/lib/dates';
import { parseJsonWith } from '@/lib/json';

import { getDb } from './client';

export type CorrectionOrigin = 'journal' | 'challenge' | 'conversation' | 'think' | 'speaking';

export type Correction = {
  id: string;
  origin: CorrectionOrigin;
  originId: string | null;
  original: string;
  correctedText: string;
  naturalVersion: string;
  edits: Edit[];
  usedRequiredItems: string[];
  savedAt: string | null;
  createdAt: string;
};

type Row = Omit<Correction, 'edits' | 'usedRequiredItems' | 'origin'> & { edits: string; usedRequiredItems: string; origin: string };

const ORIGINS: CorrectionOrigin[] = ['journal', 'challenge', 'conversation', 'think', 'speaking'];

const toCorrection = (r: Row): Correction => ({
  ...r,
  origin: ORIGINS.find((o) => o === r.origin) ?? 'journal',
  edits: parseJsonWith(r.edits, z.array(editSchema), []),
  usedRequiredItems: parseJsonWith(r.usedRequiredItems, z.array(z.string()), []),
});

export async function insertCorrection(c: Omit<Correction, 'id' | 'createdAt' | 'savedAt'>): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO corrections (id, origin, originId, original, correctedText, naturalVersion, edits, usedRequiredItems, savedAt, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    id,
    c.origin,
    c.originId,
    c.original,
    c.correctedText,
    c.naturalVersion,
    JSON.stringify(c.edits),
    JSON.stringify(c.usedRequiredItems),
    nowIso(),
  );
  return id;
}

export async function getCorrection(id: string): Promise<Correction | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>('SELECT * FROM corrections WHERE id = ?', id);
  return row ? toCorrection(row) : null;
}

export async function markCorrectionSaved(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE corrections SET savedAt = ? WHERE id = ?', nowIso(), id);
}
