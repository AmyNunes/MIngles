import { CARD_TYPES, type CardRow, type CardType, type CardWithNote, type Note } from '@/features/cards/model';
import type { SchedulingState } from '@/srs/fsrs';

import { getDb } from './client';
import { NOTE_COLUMNS, rowToNote, type NoteRow } from './notesRepo';

type RawCardRow = Omit<CardRow, 'suspended' | 'type'> & { suspended: number; type: string };

const CARD_COLUMNS =
  'c.id, c.noteId, c.type, c.due, c.stability, c.difficulty, c.elapsedDays, c.scheduledDays, ' +
  'c.learningSteps, c.reps, c.lapses, c.state, c.lastReview, c.suspended, c.createdAt';

const NOTE_COLUMNS_ALIASED = NOTE_COLUMNS.split(', ')
  .map((col) => `n.${col} AS note_${col}`)
  .join(', ');

function toCardRow(row: RawCardRow): CardRow {
  return {
    ...row,
    type: (CARD_TYPES as readonly string[]).includes(row.type) ? (row.type as CardType) : 'context',
    suspended: row.suspended === 1,
  };
}

type JoinedRow = RawCardRow & { [K in keyof NoteRow as `note_${K}`]: NoteRow[K] };

function toCardWithNote(row: JoinedRow): CardWithNote | null {
  const note = rowToNote({
    id: row.note_id,
    kind: row.note_kind,
    term: row.note_term,
    lemma: row.note_lemma,
    data: row.note_data,
    sourceId: row.note_sourceId,
    sourceLabel: row.note_sourceLabel,
    extra: row.note_extra,
    createdAt: row.note_createdAt,
    updatedAt: row.note_updatedAt,
  });
  return note ? { ...toCardRow(row), note } : null;
}

const JOINED_SELECT = `SELECT ${CARD_COLUMNS}, ${NOTE_COLUMNS_ALIASED} FROM cards c JOIN notes n ON n.id = c.noteId`;

const isPresent = <T,>(x: T | null): x is T => x != null;

export async function getCardWithNote(id: string): Promise<CardWithNote | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<JoinedRow>(`${JOINED_SELECT} WHERE c.id = ?`, id);
  return row ? toCardWithNote(row) : null;
}

export async function getCardsWithNotes(ids: string[]): Promise<CardWithNote[]> {
  if (!ids.length) return [];
  const db = await getDb();
  const rows = await db.getAllAsync<JoinedRow>(
    `${JOINED_SELECT} WHERE c.id IN (${ids.map(() => '?').join(',')})`,
    ...ids,
  );
  const byId = new Map(rows.map(toCardWithNote).filter(isPresent).map((c) => [c.id, c]));
  return ids.map((id) => byId.get(id)).filter((c): c is CardWithNote => c != null);
}

export async function getCardsOfNote(noteId: string): Promise<CardRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawCardRow>(`SELECT ${CARD_COLUMNS} FROM cards c WHERE c.noteId = ?`, noteId);
  return rows.map(toCardRow);
}

/** Cards não novos e não suspensos que vencem até `untilIso`. */
export async function getDueCards(untilIso: string): Promise<CardRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawCardRow>(
    `SELECT ${CARD_COLUMNS} FROM cards c WHERE c.suspended = 0 AND c.state != 0 AND c.due <= ?`,
    untilIso,
  );
  return rows.map(toCardRow);
}

/** Cards novos (não suspensos), na ordem de criação. */
export async function getNewCards(limit: number): Promise<CardRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawCardRow>(
    `SELECT ${CARD_COLUMNS} FROM cards c WHERE c.suspended = 0 AND c.state = 0
     ORDER BY c.createdAt, c.id LIMIT ?`,
    limit,
  );
  return rows.map(toCardRow);
}

export async function countDueCards(untilIso: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM cards WHERE suspended = 0 AND state != 0 AND due <= ?',
    untilIso,
  );
  return row?.n ?? 0;
}

export async function countNewCards(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM cards WHERE suspended = 0 AND state = 0',
  );
  return row?.n ?? 0;
}

export async function updateScheduling(id: string, s: SchedulingState): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE cards SET due = ?, stability = ?, difficulty = ?, elapsedDays = ?, scheduledDays = ?,
       learningSteps = ?, reps = ?, lapses = ?, state = ?, lastReview = ? WHERE id = ?`,
    s.due,
    s.stability,
    s.difficulty,
    s.elapsedDays,
    s.scheduledDays,
    s.learningSteps,
    s.reps,
    s.lapses,
    s.state,
    s.lastReview,
    id,
  );
}

export async function setSuspended(ids: string[], suspended: boolean): Promise<void> {
  if (!ids.length) return;
  const db = await getDb();
  await db.runAsync(
    `UPDATE cards SET suspended = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
    suspended ? 1 : 0,
    ...ids,
  );
}

/** Apaga cards; notas que ficarem sem nenhum card também saem. */
export async function deleteCards(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM cards WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids);
    await db.runAsync('DELETE FROM notes WHERE id NOT IN (SELECT DISTINCT noteId FROM cards)');
  });
}

export type CardSnapshot = { card: CardRow; note: Note };

/** Para o "Desfazer" de uma exclusão: recria nota e card exatamente como estavam. */
export async function restoreCards(snapshots: CardSnapshot[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const { card, note } of snapshots) {
      await db.runAsync(
        `INSERT OR IGNORE INTO notes (${NOTE_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        note.id,
        note.kind,
        note.term,
        note.lemma,
        JSON.stringify(note.data),
        note.sourceId,
        note.sourceLabel,
        note.extra ? JSON.stringify(note.extra) : null,
        note.createdAt,
        note.updatedAt,
      );
      await db.runAsync(
        `INSERT OR IGNORE INTO cards (id, noteId, type, due, stability, difficulty, elapsedDays, scheduledDays,
            learningSteps, reps, lapses, state, lastReview, suspended, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        card.id,
        card.noteId,
        card.type,
        card.due,
        card.stability,
        card.difficulty,
        card.elapsedDays,
        card.scheduledDays,
        card.learningSteps,
        card.reps,
        card.lapses,
        card.state,
        card.lastReview,
        card.suspended ? 1 : 0,
        card.createdAt,
      );
    }
  });
}

export type CardFilter = {
  search?: string;
  types?: CardType[];
  /** 'new' | 'learning' | 'review' | 'relearning' | 'suspended' */
  states?: string[];
};

const STATE_CODES: Record<string, number> = { new: 0, learning: 1, review: 2, relearning: 3 };

/** Lista de "Meus cartões" com busca e filtros. */
export async function listCards(filter: CardFilter): Promise<CardWithNote[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: (string | number)[] = [];

  const search = filter.search?.trim().toLowerCase();
  if (search) {
    where.push('(LOWER(n.term) LIKE ? OR n.lemma LIKE ? OR LOWER(n.data) LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (filter.types?.length) {
    where.push(`c.type IN (${filter.types.map(() => '?').join(',')})`);
    params.push(...filter.types);
  }
  if (filter.states?.length) {
    const parts: string[] = [];
    const codes = filter.states.filter((s) => s in STATE_CODES).map((s) => STATE_CODES[s]);
    if (codes.length) parts.push(`(c.suspended = 0 AND c.state IN (${codes.map(() => '?').join(',')}))`);
    params.push(...codes);
    if (filter.states.includes('suspended')) parts.push('c.suspended = 1');
    if (parts.length) where.push(`(${parts.join(' OR ')})`);
  }

  const rows = await db.getAllAsync<JoinedRow>(
    `${JOINED_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY c.createdAt DESC, c.id`,
    ...params,
  );
  return rows.map(toCardWithNote).filter(isPresent);
}

export async function cardStateCounts(): Promise<{ state: number; suspended: number; n: number }[]> {
  const db = await getDb();
  return db.getAllAsync('SELECT state, suspended, COUNT(*) AS n FROM cards GROUP BY state, suspended');
}
