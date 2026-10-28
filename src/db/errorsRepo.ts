import type { Severity } from '@/features/errors/taxonomy';
import { newId } from '@/lib/ids';
import { nowIso } from '@/lib/dates';

import { getDb } from './client';

export type ErrorRow = {
  id: string;
  correctionId: string;
  original: string;
  corrected: string;
  category: string;
  severity: Severity;
  explanationPt: string;
  disputed: boolean;
  archived: boolean;
  cardId: string | null;
  createdAt: string;
};

type Raw = Omit<ErrorRow, 'disputed' | 'archived'> & { disputed: number; archived: number };
const toError = (r: Raw): ErrorRow => ({ ...r, disputed: r.disputed === 1, archived: r.archived === 1 });

/** Só erros de verdade entram no caderno: sem "Discordo" e sem os de estilo. */
const IN_NOTEBOOK = "disputed = 0 AND severity != 'style'";

export async function insertErrors(items: Omit<ErrorRow, 'id' | 'createdAt' | 'archived'>[]): Promise<string[]> {
  const db = await getDb();
  const ids: string[] = [];
  const at = nowIso();
  await db.withTransactionAsync(async () => {
    for (const e of items) {
      const id = newId();
      ids.push(id);
      await db.runAsync(
        `INSERT INTO errors (id, correctionId, original, corrected, category, severity, explanationPt, disputed, archived, cardId, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        id,
        e.correctionId,
        e.original,
        e.corrected,
        e.category,
        e.severity,
        e.explanationPt,
        e.disputed ? 1 : 0,
        e.cardId,
        at,
      );
    }
  });
  return ids;
}

export async function setErrorCard(errorId: string, cardId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE errors SET cardId = ? WHERE id = ?', cardId, errorId);
}

export async function listErrorsByCategory(category: string, includeArchived = false): Promise<ErrorRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Raw>(
    `SELECT * FROM errors WHERE category = ? AND ${IN_NOTEBOOK} ${includeArchived ? '' : 'AND archived = 0'} ORDER BY createdAt DESC`,
    category,
  );
  return rows.map(toError);
}

export async function setErrorsArchived(ids: string[], archived: boolean): Promise<void> {
  if (!ids.length) return;
  const db = await getDb();
  await db.runAsync(
    `UPDATE errors SET archived = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
    archived ? 1 : 0,
    ...ids,
  );
}

export type CategoryCount = { category: string; n: number };

/** Contagem por categoria num período (caderno de erros, "erro da semana", contexto da IA). */
export async function errorCountsSince(sinceIso: string, untilIso = '9999'): Promise<CategoryCount[]> {
  const db = await getDb();
  return db.getAllAsync<CategoryCount>(
    `SELECT category, COUNT(*) AS n FROM errors
     WHERE ${IN_NOTEBOOK} AND createdAt >= ? AND createdAt < ?
     GROUP BY category ORDER BY n DESC`,
    sinceIso,
    untilIso,
  );
}

/** Exemplo mais recente de uma categoria ("depend of" → on). */
export async function latestErrorOf(category: string, sinceIso: string): Promise<ErrorRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Raw>(
    `SELECT * FROM errors WHERE category = ? AND ${IN_NOTEBOOK} AND createdAt >= ? ORDER BY createdAt DESC LIMIT 1`,
    category,
    sinceIso,
  );
  return row ? toError(row) : null;
}

/** Amostra para o Treino de erros: prioriza categorias frequentes e recentes. */
export async function sampleErrors(limit: number, category?: string): Promise<ErrorRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Raw>(
    `SELECT e.* FROM errors e
     JOIN (SELECT category, COUNT(*) AS n FROM errors WHERE ${IN_NOTEBOOK} GROUP BY category) c ON c.category = e.category
     WHERE e.disputed = 0 AND e.severity != 'style' AND e.archived = 0 ${category ? 'AND e.category = ?' : ''}
     ORDER BY c.n DESC, e.createdAt DESC LIMIT ?`,
    ...(category ? [category, limit] : [limit]),
  );
  return rows.map(toError);
}

export async function countErrors(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM errors WHERE ${IN_NOTEBOOK}`);
  return row?.n ?? 0;
}
