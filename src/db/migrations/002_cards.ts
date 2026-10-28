import type { Migration } from '../types';

// Fase 2. Nunca edite esta migration: crie outra.
export const migration002: Migration = {
  version: 2,
  name: 'cards',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE notes (
        id TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL,
        term TEXT NOT NULL,
        lemma TEXT NOT NULL,
        data TEXT NOT NULL,
        sourceId TEXT,
        sourceLabel TEXT,
        extra TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE INDEX idx_notes_lemma ON notes(lemma);

      CREATE TABLE cards (
        id TEXT PRIMARY KEY NOT NULL,
        noteId TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        due TEXT NOT NULL,
        stability REAL NOT NULL DEFAULT 0,
        difficulty REAL NOT NULL DEFAULT 0,
        elapsedDays INTEGER NOT NULL DEFAULT 0,
        scheduledDays INTEGER NOT NULL DEFAULT 0,
        learningSteps INTEGER NOT NULL DEFAULT 0,
        reps INTEGER NOT NULL DEFAULT 0,
        lapses INTEGER NOT NULL DEFAULT 0,
        state INTEGER NOT NULL DEFAULT 0,
        lastReview TEXT,
        suspended INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL
      );
      CREATE INDEX idx_cards_due ON cards(due);
      CREATE INDEX idx_cards_noteId ON cards(noteId);

      CREATE TABLE review_logs (
        id TEXT PRIMARY KEY NOT NULL,
        cardId TEXT NOT NULL,
        noteId TEXT NOT NULL,
        rating INTEGER NOT NULL,
        reviewedAt TEXT NOT NULL,
        studyDay TEXT NOT NULL,
        durationMs INTEGER NOT NULL DEFAULT 0,
        wasNew INTEGER NOT NULL DEFAULT 0,
        prevCard TEXT NOT NULL
      );
      CREATE INDEX idx_review_logs_reviewedAt ON review_logs(reviewedAt);
      CREATE INDEX idx_review_logs_studyDay ON review_logs(studyDay);
      CREATE INDEX idx_review_logs_cardId ON review_logs(cardId);

      CREATE TABLE daily_activity (
        date TEXT PRIMARY KEY NOT NULL,
        reviews INTEGER NOT NULL DEFAULT 0,
        newCards INTEGER NOT NULL DEFAULT 0,
        wordsWritten INTEGER NOT NULL DEFAULT 0,
        minimalDay INTEGER NOT NULL DEFAULT 0,
        sessionSteps TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE ai_cache (
        hash TEXT PRIMARY KEY NOT NULL,
        feature TEXT NOT NULL,
        response TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);
  },
};
