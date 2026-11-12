import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import type { AccountUser } from '../lib/auth';
import { getFirebaseServices } from '../lib/firebase';
import type {
  ColorSchemePreference,
  ReadingLogEntry,
  UserPreferences,
} from '../types/bible';
import { DEFAULT_PREFERENCES } from './repository';

const MAX_BATCH_OPS = 450;

export interface CloudUserState {
  existed: boolean;
  displayName: string;
  preferences: UserPreferences;
  colorScheme: ColorSchemePreference;
}

function sanitizeColorScheme(value: unknown): ColorSchemePreference {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return 'system';
}

export function sanitizePreferences(input: Partial<UserPreferences> | undefined): UserPreferences {
  const rawIds = Array.isArray(input?.seenAchievementIds) ? input.seenAchievementIds : [];
  const seenAchievementIds = rawIds
    .filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 64)
    .slice(0, 100);

  const activePlanId =
    typeof input?.activePlanId === 'string' && input.activePlanId.length > 0
      ? input.activePlanId.slice(0, 64)
      : input?.activePlanId === null
        ? null
        : DEFAULT_PREFERENCES.activePlanId;

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
  };
}

function docToReadingLog(docId: string, data: DocumentData): ReadingLogEntry | null {
  if (
    typeof data.bookId !== 'string' ||
    !Array.isArray(data.chapters) ||
    typeof data.readDate !== 'string' ||
    typeof data.loggedAt !== 'string'
  ) {
    return null;
  }

  const chapters = data.chapters
    .filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= 150)
    .slice(0, 150);

  if (chapters.length === 0) return null;

  return {
    id: typeof data.id === 'string' && data.id ? data.id : docId,
    bookId: data.bookId,
    chapters,
    readDate: data.readDate,
    loggedAt: data.loggedAt,
    ...(typeof data.note === 'string' && data.note.trim() ? { note: data.note } : {}),
    ...(typeof data.planId === 'string' && data.planId.trim() ? { planId: data.planId } : {}),
  };
}

function buildCloudReadingLogPayload(uid: string, entry: ReadingLogEntry): Record<string, unknown> {
  const chapters = [...new Set(entry.chapters)]
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 150)
    .sort((a, b) => a - b)
    .slice(0, 150);

  const payload: Record<string, unknown> = {
    id: entry.id.slice(0, 128),
    uid,
    bookId: entry.bookId.slice(0, 40),
    chapters,
    readDate: entry.readDate.slice(0, 10),
    loggedAt: entry.loggedAt.slice(0, 40),
    updatedAt: serverTimestamp(),
  };

  const trimmedNote = entry.note?.trim();
  if (trimmedNote) {
    payload.note = trimmedNote.slice(0, 2000);
  }
  const trimmedPlan = entry.planId?.trim();
  if (trimmedPlan) {
    payload.planId = trimmedPlan.slice(0, 64);
  }

  return payload;
}

export async function ensureCloudUserDoc(
  user: AccountUser,
  defaults: { preferences: UserPreferences; colorScheme: ColorSchemePreference }
): Promise<CloudUserState> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error('Cloud database is unavailable.');
  }

  const userRef = doc(services.db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    const cleanPrefs = sanitizePreferences(defaults.preferences);
    const cleanScheme = sanitizeColorScheme(defaults.colorScheme);
    const cleanName = (user.displayName ?? '').trim().slice(0, 100);
    await setDoc(userRef, {
      uid: user.uid,
      email: (user.email ?? '').trim().slice(0, 254),
      displayName: cleanName,
      preferences: cleanPrefs,
      colorScheme: cleanScheme,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return {
      existed: false,
      displayName: cleanName,
      preferences: cleanPrefs,
      colorScheme: cleanScheme,
    };
  }

  const data = snap.data();
  return {
    existed: true,
    displayName: typeof data.displayName === 'string' ? data.displayName : user.displayName ?? '',
    preferences: sanitizePreferences(data.preferences as Partial<UserPreferences> | undefined),
    colorScheme: sanitizeColorScheme(data.colorScheme),
  };
}

export async function fetchCloudLogs(uid: string): Promise<ReadingLogEntry[]> {
  const services = getFirebaseServices();
  if (!services) return [];
  const snap = await getDocs(collection(services.db, 'users', uid, 'readingLogs'));
  const logs: ReadingLogEntry[] = [];
  snap.forEach((docSnap) => {
    const parsed = docToReadingLog(docSnap.id, docSnap.data());
    if (parsed) logs.push(parsed);
  });
  return logs;
}

export function subscribeCloudSanctuary(
  uid: string,
  handlers: {
    onUserDoc: (
      state: {
        preferences: UserPreferences;
        colorScheme: ColorSchemePreference;
        displayName: string;
      },
      fromCache: boolean
    ) => void;
    onLogs: (logs: ReadingLogEntry[], fromCache: boolean) => void;
    onError: (err: Error) => void;
  }
): () => void {
  const services = getFirebaseServices();
  if (!services) return () => {};

  const unsubUser = onSnapshot(
    doc(services.db, 'users', uid),
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      handlers.onUserDoc(
        {
          preferences: sanitizePreferences(
            data.preferences as Partial<UserPreferences> | undefined
          ),
          colorScheme: sanitizeColorScheme(data.colorScheme),
          displayName: typeof data.displayName === 'string' ? data.displayName : '',
        },
        snap.metadata.fromCache
      );
    },
    (err) => handlers.onError(err)
  );

  const unsubLogs = onSnapshot(
    collection(services.db, 'users', uid, 'readingLogs'),
    (snap) => {
      const next: ReadingLogEntry[] = [];
      snap.forEach((docSnap) => {
        const parsed = docToReadingLog(docSnap.id, docSnap.data());
        if (parsed) next.push(parsed);
      });
      handlers.onLogs(next, snap.metadata.fromCache);
    },
    (err) => handlers.onError(err)
  );

  return () => {
    unsubUser();
    unsubLogs();
  };
}

export async function saveCloudPreferences(
  uid: string,
  preferences: UserPreferences
): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await updateDoc(doc(services.db, 'users', uid), {
    preferences: sanitizePreferences(preferences),
    updatedAt: serverTimestamp(),
  });
}

export async function saveCloudColorScheme(
  uid: string,
  colorScheme: ColorSchemePreference
): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await updateDoc(doc(services.db, 'users', uid), {
    colorScheme: sanitizeColorScheme(colorScheme),
    updatedAt: serverTimestamp(),
  });
}

export async function saveCloudDisplayName(uid: string, displayName: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await updateDoc(doc(services.db, 'users', uid), {
    displayName: displayName.trim().slice(0, 100),
    updatedAt: serverTimestamp(),
  });
}

export async function upsertCloudReadingLog(
  uid: string,
  entry: ReadingLogEntry
): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  const ref = doc(services.db, 'users', uid, 'readingLogs', entry.id);
  await setDoc(ref, buildCloudReadingLogPayload(uid, entry));
}

export async function deleteCloudReadingLog(uid: string, logId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await deleteDoc(doc(services.db, 'users', uid, 'readingLogs', logId));
}

export async function batchSyncReadingLogs(
  uid: string,
  upserts: ReadingLogEntry[],
  deleteIds: string[]
): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;

  type Op =
    | { type: 'set'; entry: ReadingLogEntry }
    | { type: 'delete'; id: string };

  const ops: Op[] = [
    ...deleteIds.map((id) => ({ type: 'delete' as const, id })),
    ...upserts.map((entry) => ({ type: 'set' as const, entry })),
  ];

  for (let i = 0; i < ops.length; i += MAX_BATCH_OPS) {
    const chunk = ops.slice(i, i + MAX_BATCH_OPS);
    const batch = writeBatch(services.db);
    for (const op of chunk) {
      const ref = doc(
        services.db,
        'users',
        uid,
        'readingLogs',
        op.type === 'set' ? op.entry.id : op.id
      );
      if (op.type === 'set') {
        batch.set(ref, buildCloudReadingLogPayload(uid, op.entry));
      } else {
        batch.delete(ref);
      }
    }
    await batch.commit();
  }
}

export async function replaceCloudLogs(
  uid: string,
  nextLogs: ReadingLogEntry[],
  knownExistingIds?: string[]
): Promise<void> {
  const existingIds =
    knownExistingIds ??
    (await fetchCloudLogs(uid)).map((l) => l.id);
  const nextIdSet = new Set(nextLogs.map((l) => l.id));
  const deleteIds = existingIds.filter((id) => !nextIdSet.has(id));
  await batchSyncReadingLogs(uid, nextLogs, deleteIds);
}
