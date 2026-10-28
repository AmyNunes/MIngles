import type { Migration } from '../types';

// Fase 7. Nunca edite esta migration: crie outra.
export const migration007: Migration = {
  version: 7,
  name: 'rehearsals',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE rehearsals (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        eventAt TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        prep TEXT,
        rehearsedAt TEXT,
        createdAt TEXT NOT NULL
      );
      CREATE INDEX idx_rehearsals_eventAt ON rehearsals(eventAt);
    `);
  },
};
