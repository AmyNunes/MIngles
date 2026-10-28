import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { runMigrations } from './migrate';
import { migrations } from './migrations';

const DB_NAME = 'meu-ingles.db';

let opening: Promise<SQLiteDatabase> | null = null;

async function open(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await runMigrations(db, migrations);
  return db;
}

/**
 * Banco único do app, aberto e migrado na primeira chamada.
 * Também funciona fora das telas (notificações, widget).
 */
export function getDb(): Promise<SQLiteDatabase> {
  if (!opening) {
    opening = open().catch((error: unknown) => {
      opening = null; // permite tentar de novo
      throw error;
    });
  }
  return opening;
}
