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
import {
  encodeCustomPlanSections,
  sanitizeCustomPlanDefinition,
  sanitizePlanAccentColor,
} from '../lib/customPlans';
import { getFirebaseServices } from '../lib/firebase';
import type {
  ColorSchemePreference,
  CustomPlanDefinition,
  ReadingLogEntry,
  UserPreferences,
} from '../types/bible';
import { normalizeUserPreferences } from './repository';

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
  return normalizeUserPreferences(input);
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

function docToCustomPlan(docId: string, data: DocumentData): CustomPlanDefinition | null {
  return sanitizeCustomPlanDefinition({
    id: typeof data.id === 'string' && data.id ? data.id : docId,
    title: data.title,
    description: typeof data.description === 'string' ? data.description : '',
    sectionsSpec: data.sectionsSpec,
    durationDays: data.durationDays,
    accentColor: sanitizePlanAccentColor(data.accentColor),
    createdAt: data.createdAt,
    updatedAt: typeof data.clientUpdatedAt === 'string' ? data.clientUpdatedAt : data.createdAt,
  });
}

function buildCloudCustomPlanPayload(
  uid: string,
  plan: CustomPlanDefinition
): Record<string, unknown> {
  const sectionsSpec = encodeCustomPlanSections(plan.sections).slice(0, 2000);
  return {
    id: plan.id.slice(0, 64),
    uid,
    title: plan.title.trim().slice(0, 80),
    description: plan.description.trim().slice(0, 280),
    sectionsSpec,
    durationDays: Math.max(1, Math.min(1189, Math.round(plan.durationDays))),
    accentColor: sanitizePlanAccentColor(plan.accentColor),
    createdAt: plan.createdAt.slice(0, 40),
    clientUpdatedAt: plan.updatedAt.slice(0, 40),
    updatedAt: serverTimestamp(),
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

export async function fetchCloudCustomPlans(uid: string): Promise<CustomPlanDefinition[]> {
  const services = getFirebaseServices();
  if (!services) return [];
  const snap = await getDocs(collection(services.db, 'users', uid, 'customPlans'));
  const plans: CustomPlanDefinition[] = [];
  snap.forEach((docSnap) => {
    const parsed = docToCustomPlan(docSnap.id, docSnap.data());
    if (parsed) plans.push(parsed);
  });
  return plans;
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
    onCustomPlans?: (plans: CustomPlanDefinition[], fromCache: boolean) => void;
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

  const unsubPlans = handlers.onCustomPlans
    ? onSnapshot(
        collection(services.db, 'users', uid, 'customPlans'),
        (snap) => {
          const next: CustomPlanDefinition[] = [];
          snap.forEach((docSnap) => {
            const parsed = docToCustomPlan(docSnap.id, docSnap.data());
            if (parsed) next.push(parsed);
          });
          handlers.onCustomPlans?.(next, snap.metadata.fromCache);
        },
        (err) => handlers.onError(err)
      )
    : () => {};

  return () => {
    unsubUser();
    unsubLogs();
    unsubPlans();
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

export async function upsertCloudCustomPlan(
  uid: string,
  plan: CustomPlanDefinition
): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  const ref = doc(services.db, 'users', uid, 'customPlans', plan.id);
  await setDoc(ref, buildCloudCustomPlanPayload(uid, plan));
}

export async function deleteCloudCustomPlan(uid: string, planId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await deleteDoc(doc(services.db, 'users', uid, 'customPlans', planId));
}

export async function batchSyncCustomPlans(
  uid: string,
  upserts: CustomPlanDefinition[],
  deleteIds: string[]
): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;

  type PlanOp =
    | { type: 'set'; plan: CustomPlanDefinition }
    | { type: 'delete'; id: string };

  const ops: PlanOp[] = [
    ...deleteIds.map((id) => ({ type: 'delete' as const, id })),
    ...upserts.map((plan) => ({ type: 'set' as const, plan })),
  ];

  for (let i = 0; i < ops.length; i += MAX_BATCH_OPS) {
    const chunk = ops.slice(i, i + MAX_BATCH_OPS);
    const batch = writeBatch(services.db);
    for (const op of chunk) {
      const ref = doc(
        services.db,
        'users',
        uid,
        'customPlans',
        op.type === 'set' ? op.plan.id : op.id
      );
      if (op.type === 'set') {
        batch.set(ref, buildCloudCustomPlanPayload(uid, op.plan));
      } else {
        batch.delete(ref);
      }
    }
    await batch.commit();
  }
}

export async function replaceCloudCustomPlans(
  uid: string,
  nextPlans: CustomPlanDefinition[],
  knownExistingIds?: string[]
): Promise<void> {
  const existingIds =
    knownExistingIds ??
    (await fetchCloudCustomPlans(uid)).map((p) => p.id);
  const nextIdSet = new Set(nextPlans.map((p) => p.id));
  const deleteIds = existingIds.filter((id) => !nextIdSet.has(id));
  await batchSyncCustomPlans(uid, nextPlans, deleteIds);
}
