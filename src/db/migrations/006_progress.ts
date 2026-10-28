import type { Migration } from '../types';

// Fase 6. Nunca edite esta migration: crie outra.
export const migration006: Migration = {
  version: 6,
  name: 'progress',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE weekly_summaries (
        id TEXT PRIMARY KEY NOT NULL,
        weekStart TEXT NOT NULL UNIQUE,
        stats TEXT NOT NULL,
        summaryPt TEXT NOT NULL,
        focusNextWeekPt TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);
  },
};
