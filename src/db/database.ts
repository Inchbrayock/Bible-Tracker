import Dexie, { type Table } from 'dexie';
import type { ReadingLogEntry, UserPreferences } from '../types/bible';

export interface StoredPreferencesRow {
  key: 'user';
  value: UserPreferences;
}

class SelahDatabase extends Dexie {
  readingLogs!: Table<ReadingLogEntry, string>;
  preferences!: Table<StoredPreferencesRow, string>;

  constructor() {
    super('selah-scripture-sanctuary-db');
    this.version(1).stores({
      readingLogs: 'id, bookId, readDate, loggedAt',
      preferences: 'key',
    });
  }
}

export const db = new SelahDatabase();
