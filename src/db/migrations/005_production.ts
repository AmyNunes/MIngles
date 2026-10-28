import type { Migration } from '../types';

// Fase 5. Nunca edite esta migration: crie outra.
export const migration005: Migration = {
  version: 5,
  name: 'production',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE corrections (
        id TEXT PRIMARY KEY NOT NULL,
        origin TEXT NOT NULL,
        originId TEXT,
        original TEXT NOT NULL,
        correctedText TEXT NOT NULL,
        naturalVersion TEXT NOT NULL,
        edits TEXT NOT NULL,
        usedRequiredItems TEXT NOT NULL DEFAULT '[]',
        savedAt TEXT,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE errors (
        id TEXT PRIMARY KEY NOT NULL,
        correctionId TEXT NOT NULL,
        original TEXT NOT NULL,
        corrected TEXT NOT NULL,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        explanationPt TEXT NOT NULL,
        disputed INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        cardId TEXT,
        createdAt TEXT NOT NULL
      );
      CREATE INDEX idx_errors_category ON errors(category, createdAt);

      CREATE TABLE journal_entries (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL UNIQUE,
        original TEXT NOT NULL,
        correctionId TEXT,
        wordCount INTEGER NOT NULL DEFAULT 0,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE challenges (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL UNIQUE,
        promptPt TEXT NOT NULL,
        requiredItems TEXT NOT NULL,
        exampleAnswer TEXT NOT NULL DEFAULT '',
        response TEXT,
        correctionId TEXT,
        completedAt TEXT
      );

      CREATE TABLE conversations (
        id TEXT PRIMARY KEY NOT NULL,
        topic TEXT NOT NULL,
        messages TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        endedAt TEXT,
        correctionId TEXT
      );

      CREATE TABLE quiz_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        questions TEXT NOT NULL,
        answers TEXT NOT NULL,
        score INTEGER,
        createdAt TEXT NOT NULL
      );
    `);
  },
};
