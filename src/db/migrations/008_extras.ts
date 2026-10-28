import type { Migration } from '../types';

// Fase 8. Nunca edite esta migration: crie outra.
export const migration008: Migration = {
  version: 8,
  name: 'extras',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE podcasts (
        day TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        script TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        listenedAt TEXT
      );
      CREATE TABLE speaking_recordings (
        id TEXT PRIMARY KEY NOT NULL,
        month TEXT NOT NULL,
        question TEXT NOT NULL,
        audioPath TEXT,
        transcript TEXT NOT NULL DEFAULT '',
        durationMs INTEGER NOT NULL,
        createdAt TEXT NOT NULL
      );
      CREATE INDEX idx_speaking_month ON speaking_recordings(month);
    `);
  },
};
