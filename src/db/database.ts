import Dexie, { type Table } from 'dexie';
import type {
  CustomPlanDefinition,
  ReadingLogEntry,
  UserPreferences,
} from '../types/bible';

export interface StoredPreferencesRow {
  key: 'user';
  value: UserPreferences;
}

class SelahDatabase extends Dexie {
  readingLogs!: Table<ReadingLogEntry, string>;
  preferences!: Table<StoredPreferencesRow, string>;
  customPlans!: Table<CustomPlanDefinition, string>;

  constructor() {
    super('selah-scripture-sanctuary-db');
    this.version(1).stores({
      readingLogs: 'id, bookId, readDate, loggedAt',
      preferences: 'key',
    });
    this.version(2).stores({
      readingLogs: 'id, bookId, readDate, loggedAt',
      preferences: 'key',
      customPlans: 'id, updatedAt',
    });
  }
}

export const db = new SelahDatabase();
