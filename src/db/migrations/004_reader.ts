import type { Migration } from '../types';

// Fase 4. Nunca edite esta migration: crie outra.
export const migration004: Migration = {
  version: 4,
  name: 'reader',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE sources (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        kind TEXT NOT NULL,
        content TEXT NOT NULL,
        url TEXT,
        createdAt TEXT NOT NULL,
        readingPosition REAL NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        lastReadAt TEXT,
        readAt TEXT
      );
      CREATE INDEX idx_sources_archived ON sources(archived, createdAt);

      CREATE TABLE vocab_status (
        lemma TEXT PRIMARY KEY NOT NULL,
        status TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE ai_queue (
        id TEXT PRIMARY KEY NOT NULL,
        feature TEXT NOT NULL,
        payload TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);
  },
};
