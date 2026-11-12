import { db } from './database';
import { createDemoReadingLogs } from './demoSeed';
import { todayPlainDate } from '../lib/dates';
import type { ReadingLogEntry, SanctuaryBackup, UserPreferences } from '../types/bible';

export const DEFAULT_PREFERENCES: UserPreferences = {
  streakGraceEnabled: true,
  celebrationsEnabled: true,
  activePlanId: 'gospels-acts-45',
  seenAchievementIds: [],
};

const FALLBACK_STORAGE_KEY = 'selah-fallback-sanctuary-v1';

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function readFallback(): Promise<{ logs: ReadingLogEntry[]; preferences: UserPreferences }> {
  try {
    const raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
    if (!raw) return { logs: [], preferences: { ...DEFAULT_PREFERENCES } };
    const parsed = JSON.parse(raw) as Partial<SanctuaryBackup>;
    return {
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      preferences: { ...DEFAULT_PREFERENCES, ...(parsed.preferences ?? {}) },
    };
  } catch {
    return { logs: [], preferences: { ...DEFAULT_PREFERENCES } };
  }
}

async function writeFallback(logs: ReadingLogEntry[], preferences: UserPreferences): Promise<void> {
  try {
    localStorage.setItem(
      FALLBACK_STORAGE_KEY,
      JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), logs, preferences })
    );
  } catch {
    // Ignore storage error
  }
}

export async function loadSanctuaryState(): Promise<{
  logs: ReadingLogEntry[];
  preferences: UserPreferences;
}> {
  try {
    const [logs, prefRow] = await Promise.all([
      db.readingLogs.toArray(),
      db.preferences.get('user'),
    ]);
    return {
      logs,
      preferences: { ...DEFAULT_PREFERENCES, ...(prefRow?.value ?? {}) },
    };
  } catch {
    return readFallback();
  }
}

export async function persistPreferences(preferences: UserPreferences): Promise<void> {
  try {
    await db.preferences.put({ key: 'user', value: preferences });
  } catch {
    const current = await readFallback();
    await writeFallback(current.logs, preferences);
  }
}

export async function addReadingLog(input: {
  bookId: string;
  chapters: number[];
  readDate?: string;
  note?: string;
  planId?: string;
}): Promise<ReadingLogEntry> {
  const uniqueChapters = [...new Set(input.chapters)].sort((a, b) => a - b);
  const entry: ReadingLogEntry = {
    id: createId(),
    bookId: input.bookId,
    chapters: uniqueChapters,
    readDate: input.readDate ?? todayPlainDate(),
    loggedAt: new Date().toISOString(),
    note: input.note?.trim() ? input.note.trim() : undefined,
    planId: input.planId,
  };

  try {
    await db.readingLogs.put(entry);
  } catch {
    const current = await readFallback();
    await writeFallback([...current.logs, entry], current.preferences);
  }
  return entry;
}

export async function updateReadingLog(
  id: string,
  patch: Partial<Pick<ReadingLogEntry, 'chapters' | 'readDate' | 'note'>>
): Promise<void> {
  try {
    await db.readingLogs.update(id, {
      ...patch,
      chapters: patch.chapters ? [...new Set(patch.chapters)].sort((a, b) => a - b) : undefined,
      note: patch.note !== undefined ? (patch.note.trim() || undefined) : undefined,
    });
  } catch {
    const current = await readFallback();
    const updated = current.logs.map((l) => (l.id === id ? { ...l, ...patch } : l));
    await writeFallback(updated, current.preferences);
  }
}

export async function deleteReadingLog(id: string): Promise<void> {
  try {
    await db.readingLogs.delete(id);
  } catch {
    const current = await readFallback();
    await writeFallback(
      current.logs.filter((l) => l.id !== id),
      current.preferences
    );
  }
}

/**
 * Removes specific chapters from existing logs for a book (used when un-checking chapters).
 * Deletes a log entry completely if no chapters remain in it.
 */
export async function removeChaptersFromBookLogs(
  bookId: string,
  chaptersToRemove: number[]
): Promise<ReadingLogEntry[]> {
  const removeSet = new Set(chaptersToRemove);
  const { logs, preferences } = await loadSanctuaryState();
  const nextLogs: ReadingLogEntry[] = [];

  for (const log of logs) {
    if (log.bookId !== bookId) {
      nextLogs.push(log);
      continue;
    }
    const remaining = log.chapters.filter((ch) => !removeSet.has(ch));
    if (remaining.length > 0) {
      nextLogs.push({ ...log, chapters: remaining });
    }
  }

  try {
    await db.transaction('rw', db.readingLogs, async () => {
      await db.readingLogs.clear();
      if (nextLogs.length > 0) {
        await db.readingLogs.bulkPut(nextLogs);
      }
    });
  } catch {
    await writeFallback(nextLogs, preferences);
  }

  return nextLogs;
}

export async function replaceAllLogs(logs: ReadingLogEntry[]): Promise<void> {
  const { preferences } = await loadSanctuaryState();
  try {
    await db.transaction('rw', db.readingLogs, async () => {
      await db.readingLogs.clear();
      if (logs.length > 0) {
        await db.readingLogs.bulkPut(logs);
      }
    });
  } catch {
    await writeFallback(logs, preferences);
  }
}

export async function seedDemoSanctuary(): Promise<{
  logs: ReadingLogEntry[];
  preferences: UserPreferences;
}> {
  const demoLogs = createDemoReadingLogs();
  const { preferences } = await loadSanctuaryState();
  await replaceAllLogs(demoLogs);
  return { logs: demoLogs, preferences };
}

export async function clearAllSanctuaryData(): Promise<void> {
  try {
    await db.transaction('rw', db.readingLogs, db.preferences, async () => {
      await db.readingLogs.clear();
      await db.preferences.put({ key: 'user', value: { ...DEFAULT_PREFERENCES } });
    });
  } catch {
    await writeFallback([], { ...DEFAULT_PREFERENCES });
  }
}

export function buildBackupPayload(
  logs: ReadingLogEntry[],
  preferences: UserPreferences
): SanctuaryBackup {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    logs,
    preferences,
  };
}

export function parseAndValidateBackup(rawJson: string): SanctuaryBackup {
  const parsed = JSON.parse(rawJson) as Partial<SanctuaryBackup>;
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.logs)) {
    throw new Error('Invalid Selah backup file format.');
  }
  const sanitizedLogs: ReadingLogEntry[] = parsed.logs
    .filter(
      (item): item is ReadingLogEntry =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.bookId === 'string' &&
        Array.isArray(item.chapters) &&
        typeof item.readDate === 'string' &&
        typeof item.loggedAt === 'string'
    )
    .map((item) => ({
      ...item,
      chapters: item.chapters.filter((n) => Number.isInteger(n) && n >= 1),
    }))
    .filter((item) => item.chapters.length > 0);

  return {
    version: 1,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    logs: sanitizedLogs,
    preferences: { ...DEFAULT_PREFERENCES, ...(parsed.preferences ?? {}) },
  };
}
