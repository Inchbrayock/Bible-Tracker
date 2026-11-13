import { db } from './database';
import { createDemoReadingLogs } from './demoSeed';
import { CORE_DEFAULT_PLAN_IDS } from '../data/readingPlans';
import { sanitizeCustomPlanDefinition } from '../lib/customPlans';
import { todayPlainDate } from '../lib/dates';
import { sanitizeShelfPlanIds } from '../lib/plans';
import type {
  CustomPlanDefinition,
  ReadingLogEntry,
  SanctuaryBackup,
  UserPreferences,
} from '../types/bible';

export const DEFAULT_PREFERENCES: UserPreferences = {
  streakGraceEnabled: true,
  celebrationsEnabled: true,
  activePlanId: 'gospels-acts-45',
  seenAchievementIds: [],
  shelfPlanIds: [...CORE_DEFAULT_PLAN_IDS],
};

export function normalizeUserPreferences(
  input: Partial<UserPreferences> | undefined,
  legacyCustomPlans: CustomPlanDefinition[] = []
): UserPreferences {
  const rawSeen = Array.isArray(input?.seenAchievementIds) ? input.seenAchievementIds : [];
  const seenAchievementIds = rawSeen
    .filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 64)
    .slice(0, 100);

  const activePlanId =
    typeof input?.activePlanId === 'string' && input.activePlanId.length > 0
      ? input.activePlanId.slice(0, 64)
      : input?.activePlanId === null
        ? null
        : DEFAULT_PREFERENCES.activePlanId;

  const legacyFallback = [
    ...CORE_DEFAULT_PLAN_IDS,
    ...legacyCustomPlans.map((p) => p.id),
    ...(activePlanId ? [activePlanId] : []),
  ];

  const shelfPlanIds = sanitizeShelfPlanIds(input?.shelfPlanIds, legacyFallback);

  return {
    streakGraceEnabled:
      typeof input?.streakGraceEnabled === 'boolean'
        ? input.streakGraceEnabled
        : DEFAULT_PREFERENCES.streakGraceEnabled,
    celebrationsEnabled:
      typeof input?.celebrationsEnabled === 'boolean'
        ? input.celebrationsEnabled
        : DEFAULT_PREFERENCES.celebrationsEnabled,
    activePlanId,
    seenAchievementIds,
    shelfPlanIds,
  };
}

const FALLBACK_STORAGE_KEY = 'selah-fallback-sanctuary-v1';
const LOCAL_OWNER_UID_KEY = 'selah-cloud-owner-uid';

export function getLocalOwnerUid(): string | null {
  try {
    return localStorage.getItem(LOCAL_OWNER_UID_KEY);
  } catch {
    return null;
  }
}

export function setLocalOwnerUid(uid: string | null): void {
  try {
    if (uid) {
      localStorage.setItem(LOCAL_OWNER_UID_KEY, uid);
    } else {
      localStorage.removeItem(LOCAL_OWNER_UID_KEY);
    }
  } catch {
    // Ignore storage error
  }
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function readFallback(): Promise<{
  logs: ReadingLogEntry[];
  preferences: UserPreferences;
  customPlans: CustomPlanDefinition[];
}> {
  try {
    const raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
    if (!raw) return { logs: [], preferences: { ...DEFAULT_PREFERENCES }, customPlans: [] };
    const parsed = JSON.parse(raw) as Partial<SanctuaryBackup>;
    const customPlans = Array.isArray(parsed.customPlans)
      ? parsed.customPlans
          .map((item) => sanitizeCustomPlanDefinition(item))
          .filter((item): item is CustomPlanDefinition => item !== null)
      : [];
    return {
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      preferences: normalizeUserPreferences(parsed.preferences, customPlans),
      customPlans,
    };
  } catch {
    return { logs: [], preferences: { ...DEFAULT_PREFERENCES }, customPlans: [] };
  }
}

async function writeFallback(
  logs: ReadingLogEntry[],
  preferences: UserPreferences,
  customPlans: CustomPlanDefinition[]
): Promise<void> {
  try {
    localStorage.setItem(
      FALLBACK_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        logs,
        preferences,
        customPlans,
      })
    );
  } catch {
    // Ignore storage error
  }
}

export async function loadSanctuaryState(): Promise<{
  logs: ReadingLogEntry[];
  preferences: UserPreferences;
  customPlans: CustomPlanDefinition[];
}> {
  try {
    const [logs, prefRow, rawCustomPlans] = await Promise.all([
      db.readingLogs.toArray(),
      db.preferences.get('user'),
      db.customPlans.toArray(),
    ]);
    const customPlans = rawCustomPlans
      .map((item) => sanitizeCustomPlanDefinition(item))
      .filter((item): item is CustomPlanDefinition => item !== null);
    return {
      logs,
      preferences: normalizeUserPreferences(prefRow?.value, customPlans),
      customPlans,
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
    await writeFallback(current.logs, preferences, current.customPlans);
  }
}

export async function upsertCustomPlan(plan: CustomPlanDefinition): Promise<void> {
  try {
    await db.customPlans.put(plan);
  } catch {
    const current = await readFallback();
    const exists = current.customPlans.some((p) => p.id === plan.id);
    const nextPlans = exists
      ? current.customPlans.map((p) => (p.id === plan.id ? plan : p))
      : [...current.customPlans, plan];
    await writeFallback(current.logs, current.preferences, nextPlans);
  }
}

export async function deleteCustomPlan(id: string): Promise<void> {
  try {
    await db.customPlans.delete(id);
  } catch {
    const current = await readFallback();
    await writeFallback(
      current.logs,
      current.preferences,
      current.customPlans.filter((p) => p.id !== id)
    );
  }
}

export async function replaceAllCustomPlans(customPlans: CustomPlanDefinition[]): Promise<void> {
  const current = await loadSanctuaryState();
  try {
    await db.transaction('rw', db.customPlans, async () => {
      await db.customPlans.clear();
      if (customPlans.length > 0) {
        await db.customPlans.bulkPut(customPlans);
      }
    });
  } catch {
    await writeFallback(current.logs, current.preferences, customPlans);
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
    await writeFallback([...current.logs, entry], current.preferences, current.customPlans);
  }
  return entry;
}

export async function updateReadingLog(
  id: string,
  patch: Partial<Pick<ReadingLogEntry, 'chapters' | 'readDate' | 'note'>>
): Promise<void> {
  const sanitizedPatch: Partial<Pick<ReadingLogEntry, 'chapters' | 'readDate' | 'note'>> = {};
  if (patch.chapters !== undefined) {
    sanitizedPatch.chapters = [...new Set(patch.chapters)].sort((a, b) => a - b);
  }
  if (patch.readDate !== undefined) {
    sanitizedPatch.readDate = patch.readDate;
  }
  if (patch.note !== undefined) {
    sanitizedPatch.note = patch.note.trim() || undefined;
  }

  try {
    await db.readingLogs.update(id, sanitizedPatch);
  } catch {
    const current = await readFallback();
    const updated = current.logs.map((l) => (l.id === id ? { ...l, ...sanitizedPatch } : l));
    await writeFallback(updated, current.preferences, current.customPlans);
  }
}

export async function deleteReadingLog(id: string): Promise<void> {
  try {
    await db.readingLogs.delete(id);
  } catch {
    const current = await readFallback();
    await writeFallback(
      current.logs.filter((l) => l.id !== id),
      current.preferences,
      current.customPlans
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
  const { logs, preferences, customPlans } = await loadSanctuaryState();
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
    await writeFallback(nextLogs, preferences, customPlans);
  }

  return nextLogs;
}

export async function replaceAllLogs(logs: ReadingLogEntry[]): Promise<void> {
  const { preferences, customPlans } = await loadSanctuaryState();
  try {
    await db.transaction('rw', db.readingLogs, async () => {
      await db.readingLogs.clear();
      if (logs.length > 0) {
        await db.readingLogs.bulkPut(logs);
      }
    });
  } catch {
    await writeFallback(logs, preferences, customPlans);
  }
}

export async function seedDemoSanctuary(): Promise<{
  logs: ReadingLogEntry[];
  preferences: UserPreferences;
  customPlans: CustomPlanDefinition[];
}> {
  const demoLogs = createDemoReadingLogs();
  const { preferences, customPlans } = await loadSanctuaryState();
  await replaceAllLogs(demoLogs);
  return { logs: demoLogs, preferences, customPlans };
}

export async function clearAllSanctuaryData(): Promise<void> {
  try {
    await db.transaction('rw', db.readingLogs, db.preferences, db.customPlans, async () => {
      await db.readingLogs.clear();
      await db.preferences.put({ key: 'user', value: { ...DEFAULT_PREFERENCES } });
      await db.customPlans.clear();
    });
  } catch {
    await writeFallback([], { ...DEFAULT_PREFERENCES }, []);
  }
}

export function buildBackupPayload(
  logs: ReadingLogEntry[],
  preferences: UserPreferences,
  customPlans: CustomPlanDefinition[] = []
): SanctuaryBackup {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    logs,
    preferences,
    ...(customPlans.length > 0 ? { customPlans } : {}),
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

  const customPlans = Array.isArray(parsed.customPlans)
    ? parsed.customPlans
        .map((item) => sanitizeCustomPlanDefinition(item))
        .filter((item): item is CustomPlanDefinition => item !== null)
    : [];

  return {
    version: 1,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    logs: sanitizedLogs,
    preferences: normalizeUserPreferences(parsed.preferences, customPlans),
    customPlans,
  };
}
