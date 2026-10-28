import type { Migration } from '../types';

// Fase 3. Nunca edite esta migration: crie outra.
export const migration003: Migration = {
  version: 3,
  name: 'notifications',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE notification_log (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        scheduledFor TEXT NOT NULL,
        notificationId TEXT,
        openedAt TEXT
      );
      CREATE INDEX idx_notification_log_scheduledFor ON notification_log(scheduledFor);
    `);
  },
};
