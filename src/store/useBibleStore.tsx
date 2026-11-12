import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BOOKS_BY_ID } from '../data/bibleCanon';
import {
  batchSyncReadingLogs,
  deleteCloudReadingLog,
  ensureCloudUserDoc,
  fetchCloudLogs,
  replaceCloudLogs,
  saveCloudColorScheme,
  saveCloudDisplayName,
  saveCloudPreferences,
  subscribeCloudSanctuary,
  upsertCloudReadingLog,
} from '../db/cloudSync';
import {
  addReadingLog,
  buildBackupPayload,
  clearAllSanctuaryData,
  DEFAULT_PREFERENCES,
  deleteReadingLog,
  getLocalOwnerUid,
  loadSanctuaryState,
  parseAndValidateBackup,
  persistPreferences,
  removeChaptersFromBookLogs,
  replaceAllLogs,
  seedDemoSanctuary,
  setLocalOwnerUid,
  updateReadingLog,
} from '../db/repository';
import { evaluateAchievements } from '../lib/achievementsEngine';
import {
  formatAuthError,
  isAuthAvailable,
  sendAccountPasswordReset,
  signInWithAppleAccount,
  signInWithEmailAccount,
  signInWithGoogleAccount,
  signOutAccount,
  signUpWithEmailAccount,
  subscribeToAuthState,
  updateAccountDisplayName,
  type AccountUser,
} from '../lib/auth';
import { celebrateAchievementUnlocked, celebrateBookCompleted } from '../lib/celebration';
import { todayPlainDate } from '../lib/dates';
import { syncNativeStatusBar, triggerNativeHaptic } from '../lib/nativeShell';
import { computeBibleProgress, formatChapterRanges } from '../lib/progress';
import {
  applyColorScheme,
  getResolvedColorScheme,
  getStoredColorScheme,
  subscribeColorSchemeChanges,
} from '../lib/theme';
import type {
  AchievementStatus,
  BibleProgressSummary,
  ColorSchemePreference,
  ReadingLogEntry,
  UserPreferences,
} from '../types/bible';

export type CloudSyncStatus = 'local' | 'syncing' | 'synced' | 'offline' | 'error';

export interface PendingGuestMerge {
  guestLogs: ReadingLogEntry[];
  guestPreferences: UserPreferences;
  cloudLogsCount: number;
}

interface BibleStoreValue {
  ready: boolean;
  logs: ReadingLogEntry[];
  preferences: UserPreferences;
  colorScheme: ColorSchemePreference;
  summary: BibleProgressSummary;
  achievements: AchievementStatus[];
  unlockedQueue: AchievementStatus[];
  announcement: string;
  firebaseAvailable: boolean;
  user: AccountUser | null;
  authLoading: boolean;
  syncStatus: CloudSyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  pendingMerge: PendingGuestMerge | null;
  setColorScheme: (pref: ColorSchemePreference) => void;
  updatePreferences: (patch: Partial<UserPreferences>) => Promise<void>;
  logChapters: (input: {
    bookId: string;
    chapters: number[];
    readDate?: string;
    note?: string;
    planId?: string;
  }) => Promise<void>;
  toggleChapter: (
    bookId: string,
    chapter: number,
    options?: { rereadMode?: boolean; readDate?: string }
  ) => Promise<void>;
  markBookComplete: (bookId: string, readDate?: string) => Promise<void>;
  clearBookProgress: (bookId: string) => Promise<void>;
  editLog: (
    id: string,
    patch: Partial<Pick<ReadingLogEntry, 'chapters' | 'readDate' | 'note'>>
  ) => Promise<void>;
  removeLog: (id: string) => Promise<void>;
  dismissUnlockedAchievement: (id: string) => void;
  exportBackupJson: () => string;
  importBackupJson: (raw: string) => Promise<number>;
  activateDemoJourney: () => Promise<void>;
  resetAllData: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  resolveGuestMerge: (strategy: 'merge' | 'cloud-only') => Promise<void>;
  syncNow: () => Promise<void>;
}

const BibleStoreContext = createContext<BibleStoreValue | null>(null);

function normalizeLogsSignature(list: ReadingLogEntry[]): string {
  return [...list]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(
      (l) =>
        `${l.id}|${l.bookId}|${l.chapters.join(',')}|${l.readDate}|${l.loggedAt}|${l.note ?? ''}|${l.planId ?? ''}`
    )
    .join('\n');
}

function arePreferencesEqual(a: UserPreferences, b: UserPreferences): boolean {
  return (
    a.streakGraceEnabled === b.streakGraceEnabled &&
    a.celebrationsEnabled === b.celebrationsEnabled &&
    a.activePlanId === b.activePlanId &&
    a.seenAchievementIds.length === b.seenAchievementIds.length &&
    a.seenAchievementIds.every((id, idx) => id === b.seenAchievementIds[idx])
  );
}

function diffLogsForSync(
  prevLogs: ReadingLogEntry[],
  nextLogs: ReadingLogEntry[]
): { upserts: ReadingLogEntry[]; deleteIds: string[] } {
  const prevById = new Map(prevLogs.map((l) => [l.id, l]));
  const nextById = new Map(nextLogs.map((l) => [l.id, l]));

  const deleteIds: string[] = [];
  for (const prev of prevLogs) {
    if (!nextById.has(prev.id)) {
      deleteIds.push(prev.id);
    }
  }

  const upserts: ReadingLogEntry[] = [];
  for (const next of nextLogs) {
    const prev = prevById.get(next.id);
    if (
      !prev ||
      prev.chapters.join(',') !== next.chapters.join(',') ||
      prev.readDate !== next.readDate ||
      prev.note !== next.note
    ) {
      upserts.push(next);
    }
  }

  return { upserts, deleteIds };
}

function formatCloudError(error: unknown): string {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'Offline — changes are saved locally and will sync when reconnected.';
  }
  return error instanceof Error ? error.message : 'Cloud sync encountered an error.';
}

export const BibleStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const firebaseAvailable = isAuthAvailable();

  const [ready, setReady] = useState(false);
  const [logs, setLogs] = useState<ReadingLogEntry[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({ ...DEFAULT_PREFERENCES });
  const [colorScheme, setColorSchemeState] = useState<ColorSchemePreference>(() =>
    getStoredColorScheme()
  );
  const [unlockedQueue, setUnlockedQueue] = useState<AchievementStatus[]>([]);
  const [announcement, setAnnouncement] = useState('');

  const [user, setUser] = useState<AccountUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(firebaseAvailable);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('local');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [pendingMerge, setPendingMerge] = useState<PendingGuestMerge | null>(null);

  const prevUnlockedSetRef = useRef<Set<string> | null>(null);
  const logsRef = useRef<ReadingLogEntry[]>(logs);
  logsRef.current = logs;
  const prefsRef = useRef<UserPreferences>(preferences);
  prefsRef.current = preferences;
  const colorSchemeRef = useRef<ColorSchemePreference>(colorScheme);
  colorSchemeRef.current = colorScheme;
  const userRef = useRef<AccountUser | null>(user);
  userRef.current = user;

  const authSessionTokenRef = useRef(0);
  const cloudUnsubRef = useRef<(() => void) | null>(null);
  const pendingWritesRef = useRef(0);
  const initialLocalLoadPromiseRef = useRef<Promise<void> | null>(null);

  const hydrateSilently = useCallback(
    (nextLogs: ReadingLogEntry[], nextPrefs: UserPreferences) => {
      const nextSummary = computeBibleProgress(nextLogs, {
        streakGraceEnabled: nextPrefs.streakGraceEnabled,
      });
      const nextAchievements = evaluateAchievements(nextLogs, nextSummary);
      prevUnlockedSetRef.current = new Set(
        nextAchievements.filter((a) => a.unlocked).map((a) => a.definition.id)
      );
      logsRef.current = nextLogs;
      prefsRef.current = nextPrefs;
      setLogs(nextLogs);
      setPreferences(nextPrefs);
      setUnlockedQueue([]);
    },
    []
  );

  const runCloudWrite = useCallback((op: () => Promise<void>) => {
    if (!userRef.current) return;
    pendingWritesRef.current += 1;
    setSyncStatus(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'syncing');
    setSyncError(null);

    void op()
      .then(() => {
        pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1);
        if (pendingWritesRef.current === 0 && userRef.current) {
          setSyncStatus('synced');
          setLastSyncedAt(new Date().toISOString());
        }
      })
      .catch((err) => {
        pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1);
        if (!userRef.current) return;
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        setSyncStatus(offline ? 'offline' : 'error');
        setSyncError(formatCloudError(err));
      });
  }, []);

  useEffect(() => {
    void syncNativeStatusBar(getResolvedColorScheme(colorScheme));
  }, [colorScheme]);

  useEffect(() => {
    const unsubscribe = subscribeColorSchemeChanges((next) => {
      setColorSchemeState(next);
      void syncNativeStatusBar(getResolvedColorScheme(next));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      if (userRef.current && pendingWritesRef.current === 0) {
        setSyncStatus('synced');
        setSyncError(null);
      }
    };
    const handleOffline = () => {
      if (userRef.current) {
        setSyncStatus('offline');
      }
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadPromise = loadSanctuaryState().then(
      ({ logs: loadedLogs, preferences: loadedPrefs }) => {
        if (!active) return;
        const initialSummary = computeBibleProgress(loadedLogs, {
          streakGraceEnabled: loadedPrefs.streakGraceEnabled,
        });
        const initialAchievements = evaluateAchievements(loadedLogs, initialSummary);
        const alreadyUnlocked = new Set(
          initialAchievements.filter((a) => a.unlocked).map((a) => a.definition.id)
        );
        prevUnlockedSetRef.current = alreadyUnlocked;
        logsRef.current = loadedLogs;
        prefsRef.current = loadedPrefs;
        setLogs(loadedLogs);
        setPreferences(loadedPrefs);
        setReady(true);
      }
    );
    initialLocalLoadPromiseRef.current = loadPromise;
    return () => {
      active = false;
    };
  }, []);

  const attachCloudListeners = useCallback(
    (uid: string, sessionToken: number) => {
      cloudUnsubRef.current?.();
      cloudUnsubRef.current = subscribeCloudSanctuary(uid, {
        onUserDoc: (docState, fromCache) => {
          if (authSessionTokenRef.current !== sessionToken) return;
          if (!arePreferencesEqual(prefsRef.current, docState.preferences)) {
            prefsRef.current = docState.preferences;
            setPreferences(docState.preferences);
            void persistPreferences(docState.preferences);
          }
          if (docState.colorScheme !== colorSchemeRef.current) {
            applyColorScheme(docState.colorScheme);
            setColorSchemeState(docState.colorScheme);
          }
          if (docState.displayName !== (userRef.current?.displayName ?? '')) {
            setUser((prev) =>
              prev ? { ...prev, displayName: docState.displayName || null } : prev
            );
          }
          if (pendingWritesRef.current === 0) {
            setSyncStatus(fromCache ? 'offline' : 'synced');
            if (!fromCache) setLastSyncedAt(new Date().toISOString());
          }
        },
        onLogs: (nextCloudLogs, fromCache) => {
          if (authSessionTokenRef.current !== sessionToken) return;
          if (
            normalizeLogsSignature(logsRef.current) !==
            normalizeLogsSignature(nextCloudLogs)
          ) {
            hydrateSilently(nextCloudLogs, prefsRef.current);
            void replaceAllLogs(nextCloudLogs);
          }
          if (pendingWritesRef.current === 0) {
            setSyncStatus(fromCache ? 'offline' : 'synced');
            if (!fromCache) setLastSyncedAt(new Date().toISOString());
          }
        },
        onError: (err) => {
          if (authSessionTokenRef.current !== sessionToken) return;
          setSyncStatus('error');
          setSyncError(formatCloudError(err));
        },
      });
    },
    [hydrateSilently]
  );

  useEffect(() => {
    if (!firebaseAvailable) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = subscribeToAuthState((nextUser) => {
      const sessionToken = ++authSessionTokenRef.current;

      void (async () => {
        if (initialLocalLoadPromiseRef.current) {
          await initialLocalLoadPromiseRef.current;
        }
        if (authSessionTokenRef.current !== sessionToken) return;

        if (!nextUser) {
          cloudUnsubRef.current?.();
          cloudUnsubRef.current = null;
          const hadCloudOwner = Boolean(getLocalOwnerUid() || userRef.current);
          setUser(null);
          userRef.current = null;
          setAuthLoading(false);
          setPendingMerge(null);
          setSyncStatus('local');
          setSyncError(null);
          setLastSyncedAt(null);

          if (hadCloudOwner) {
            setLocalOwnerUid(null);
            await clearAllSanctuaryData();
            if (authSessionTokenRef.current !== sessionToken) return;
            hydrateSilently([], { ...DEFAULT_PREFERENCES });
          }
          return;
        }

        setUser(nextUser);
        userRef.current = nextUser;
        setAuthLoading(false);
        setSyncStatus('syncing');
        setSyncError(null);

        try {
          const localLogs = logsRef.current;
          const localPrefs = prefsRef.current;
          const localScheme = colorSchemeRef.current;
          const prevOwnerUid = getLocalOwnerUid();

          const cloudUser = await ensureCloudUserDoc(nextUser, {
            preferences: localPrefs,
            colorScheme: localScheme,
          });
          const cloudLogs = await fetchCloudLogs(nextUser.uid);

          if (authSessionTokenRef.current !== sessionToken) return;

          const hasUnsyncedGuestData = !prevOwnerUid && localLogs.length > 0;

          if (hasUnsyncedGuestData && cloudLogs.length === 0) {
            await batchSyncReadingLogs(nextUser.uid, localLogs, []);
            await saveCloudPreferences(nextUser.uid, localPrefs);
            await saveCloudColorScheme(nextUser.uid, localScheme);
            if (authSessionTokenRef.current !== sessionToken) return;
            setLocalOwnerUid(nextUser.uid);
            setPendingMerge(null);
            setSyncStatus('synced');
            setLastSyncedAt(new Date().toISOString());
            setAnnouncement(
              `Signed in and saved ${localLogs.length} reading ${localLogs.length === 1 ? 'entry' : 'entries'} to your account.`
            );
          } else if (hasUnsyncedGuestData && cloudLogs.length > 0) {
            setPendingMerge({
              guestLogs: localLogs,
              guestPreferences: localPrefs,
              cloudLogsCount: cloudLogs.length,
            });
            hydrateSilently(cloudLogs, cloudUser.preferences);
            await replaceAllLogs(cloudLogs);
            await persistPreferences(cloudUser.preferences);
            if (cloudUser.existed && cloudUser.colorScheme !== localScheme) {
              applyColorScheme(cloudUser.colorScheme);
              setColorSchemeState(cloudUser.colorScheme);
            }
            setLocalOwnerUid(nextUser.uid);
            setSyncStatus('synced');
            setLastSyncedAt(new Date().toISOString());
          } else {
            setPendingMerge(null);
            if (
              normalizeLogsSignature(localLogs) !== normalizeLogsSignature(cloudLogs) ||
              !arePreferencesEqual(localPrefs, cloudUser.preferences)
            ) {
              hydrateSilently(cloudLogs, cloudUser.preferences);
              await replaceAllLogs(cloudLogs);
              await persistPreferences(cloudUser.preferences);
            }
            if (cloudUser.existed && cloudUser.colorScheme !== localScheme) {
              applyColorScheme(cloudUser.colorScheme);
              setColorSchemeState(cloudUser.colorScheme);
            }
            if (cloudUser.displayName && cloudUser.displayName !== nextUser.displayName) {
              setUser((prev) =>
                prev ? { ...prev, displayName: cloudUser.displayName } : prev
              );
            }
            setLocalOwnerUid(nextUser.uid);
            setSyncStatus('synced');
            setLastSyncedAt(new Date().toISOString());
          }

          attachCloudListeners(nextUser.uid, sessionToken);
        } catch (err) {
          if (authSessionTokenRef.current !== sessionToken) return;
          const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
          setSyncStatus(offline ? 'offline' : 'error');
          setSyncError(formatCloudError(err));
          attachCloudListeners(nextUser.uid, sessionToken);
        }
      })();
    });

    return () => {
      unsubscribe();
      cloudUnsubRef.current?.();
      cloudUnsubRef.current = null;
    };
  }, [attachCloudListeners, firebaseAvailable, hydrateSilently]);

  const summary = useMemo(
    () =>
      computeBibleProgress(logs, {
        streakGraceEnabled: preferences.streakGraceEnabled,
      }),
    [logs, preferences.streakGraceEnabled]
  );

  const achievements = useMemo(
    () => evaluateAchievements(logs, summary),
    [logs, summary]
  );

  // Detect newly unlocked achievements cleanly after mutations
  useEffect(() => {
    if (!ready || prevUnlockedSetRef.current === null) return;
    const prevSet = prevUnlockedSetRef.current;
    const newlyUnlocked = achievements.filter(
      (a) => a.unlocked && !prevSet.has(a.definition.id)
    );

    // Always sync reference to current unlocked IDs (handles deletes/resets too)
    prevUnlockedSetRef.current = new Set(
      achievements.filter((a) => a.unlocked).map((a) => a.definition.id)
    );

    if (newlyUnlocked.length > 0) {
      setUnlockedQueue((q) => {
        const existingIds = new Set(q.map((item) => item.definition.id));
        const toAdd = newlyUnlocked.filter((item) => !existingIds.has(item.definition.id));
        return [...q, ...toAdd];
      });
      const hasMajor = newlyUnlocked.some(
        (a) => a.definition.tier === 'gold' || a.definition.tier === 'luminous'
      );
      celebrateAchievementUnlocked(prefsRef.current.celebrationsEnabled, hasMajor);
      setAnnouncement(
        `Achievement unlocked: ${newlyUnlocked.map((a) => a.definition.title).join(', ')}`
      );
    }
  }, [achievements, ready]);

  const setColorScheme = useCallback(
    (pref: ColorSchemePreference) => {
      applyColorScheme(pref);
      colorSchemeRef.current = pref;
      setColorSchemeState(pref);
      const uid = userRef.current?.uid;
      if (uid) {
        runCloudWrite(() => saveCloudColorScheme(uid, pref));
      }
    },
    [runCloudWrite]
  );

  const updatePreferences = useCallback(
    async (patch: Partial<UserPreferences>) => {
      const next = { ...prefsRef.current, ...patch };
      prefsRef.current = next;
      setPreferences(next);
      await persistPreferences(next);
      const uid = userRef.current?.uid;
      if (uid) {
        runCloudWrite(() => saveCloudPreferences(uid, next));
      }
    },
    [runCloudWrite]
  );

  const logChapters = useCallback(
    async (input: {
      bookId: string;
      chapters: number[];
      readDate?: string;
      note?: string;
      planId?: string;
    }) => {
      const book = BOOKS_BY_ID[input.bookId];
      if (!book || input.chapters.length === 0) return;

      const currentSummary = computeBibleProgress(logsRef.current, {
        streakGraceEnabled: prefsRef.current.streakGraceEnabled,
      });
      const wasCompletedBefore = currentSummary.bookProgressById[book.id]?.completed ?? false;

      const entry = await addReadingLog(input);
      const nextLogs = [...logsRef.current, entry];
      logsRef.current = nextLogs;
      setLogs(nextLogs);

      const nextSummary = computeBibleProgress(nextLogs, {
        streakGraceEnabled: prefsRef.current.streakGraceEnabled,
      });
      const isNowCompleted = nextSummary.bookProgressById[book.id]?.completed ?? false;
      if (!wasCompletedBefore && isNowCompleted) {
        celebrateBookCompleted(prefsRef.current.celebrationsEnabled);
      } else if (prefsRef.current.celebrationsEnabled) {
        void triggerNativeHaptic('tap');
      }

      setAnnouncement(`Logged ${book.name} ${formatChapterRanges(entry.chapters)}.`);

      const uid = userRef.current?.uid;
      if (uid) {
        runCloudWrite(() => upsertCloudReadingLog(uid, entry));
      }
    },
    [runCloudWrite]
  );

  const toggleChapter = useCallback(
    async (
      bookId: string,
      chapter: number,
      options?: { rereadMode?: boolean; readDate?: string }
    ) => {
      const book = BOOKS_BY_ID[bookId];
      if (!book) return;
      const bp = summary.bookProgressById[bookId];
      const alreadyRead = Boolean(bp?.chapterMap[chapter]);

      if (!alreadyRead || options?.rereadMode) {
        await logChapters({
          bookId,
          chapters: [chapter],
          readDate: options?.readDate ?? todayPlainDate(),
        });
      } else {
        const prevLogs = logsRef.current;
        const nextLogs = await removeChaptersFromBookLogs(bookId, [chapter]);
        logsRef.current = nextLogs;
        setLogs(nextLogs);
        if (prefsRef.current.celebrationsEnabled) {
          void triggerNativeHaptic('tap');
        }
        setAnnouncement(`Removed ${book.name} chapter ${chapter} from your logs.`);

        const uid = userRef.current?.uid;
        if (uid) {
          const { upserts, deleteIds } = diffLogsForSync(prevLogs, nextLogs);
          if (upserts.length > 0 || deleteIds.length > 0) {
            runCloudWrite(() => batchSyncReadingLogs(uid, upserts, deleteIds));
          }
        }
      }
    },
    [logChapters, runCloudWrite, summary.bookProgressById]
  );

  const markBookComplete = useCallback(
    async (bookId: string, readDate?: string) => {
      const book = BOOKS_BY_ID[bookId];
      if (!book) return;
      const bp = summary.bookProgressById[bookId];
      const unread: number[] = [];
      for (let ch = 1; ch <= book.chapterCount; ch++) {
        if (!bp?.chapterMap[ch]) unread.push(ch);
      }
      const targetChapters =
        unread.length > 0
          ? unread
          : Array.from({ length: book.chapterCount }, (_, idx) => idx + 1);
      await logChapters({
        bookId,
        chapters: targetChapters,
        readDate: readDate ?? todayPlainDate(),
      });
    },
    [logChapters, summary.bookProgressById]
  );

  const clearBookProgress = useCallback(
    async (bookId: string) => {
      const book = BOOKS_BY_ID[bookId];
      if (!book) return;
      const prevLogs = logsRef.current;
      const allChapters = Array.from({ length: book.chapterCount }, (_, idx) => idx + 1);
      const nextLogs = await removeChaptersFromBookLogs(bookId, allChapters);
      logsRef.current = nextLogs;
      setLogs(nextLogs);
      setAnnouncement(`Cleared reading logs for ${book.name}.`);

      const uid = userRef.current?.uid;
      if (uid) {
        const { upserts, deleteIds } = diffLogsForSync(prevLogs, nextLogs);
        if (upserts.length > 0 || deleteIds.length > 0) {
          runCloudWrite(() => batchSyncReadingLogs(uid, upserts, deleteIds));
        }
      }
    },
    [runCloudWrite]
  );

  const editLog = useCallback(
    async (
      id: string,
      patch: Partial<Pick<ReadingLogEntry, 'chapters' | 'readDate' | 'note'>>
    ) => {
      await updateReadingLog(id, patch);
      let updatedEntry: ReadingLogEntry | null = null;
      const nextLogs = logsRef.current.map((l) => {
        if (l.id !== id) return l;
        updatedEntry = {
          ...l,
          ...patch,
          chapters: patch.chapters
            ? [...new Set(patch.chapters)].sort((a, b) => a - b)
            : l.chapters,
          note: patch.note !== undefined ? patch.note.trim() || undefined : l.note,
        };
        return updatedEntry;
      });
      logsRef.current = nextLogs;
      setLogs(nextLogs);
      setAnnouncement('Updated reading log entry.');

      const uid = userRef.current?.uid;
      if (uid && updatedEntry) {
        const entryToSync = updatedEntry;
        runCloudWrite(() => upsertCloudReadingLog(uid, entryToSync));
      }
    },
    [runCloudWrite]
  );

  const removeLog = useCallback(
    async (id: string) => {
      await deleteReadingLog(id);
      const nextLogs = logsRef.current.filter((l) => l.id !== id);
      logsRef.current = nextLogs;
      setLogs(nextLogs);
      setAnnouncement('Deleted reading log entry.');

      const uid = userRef.current?.uid;
      if (uid) {
        runCloudWrite(() => deleteCloudReadingLog(uid, id));
      }
    },
    [runCloudWrite]
  );

  const dismissUnlockedAchievement = useCallback((id: string) => {
    setUnlockedQueue((prev) => prev.filter((item) => item.definition.id !== id));
  }, []);

  const exportBackupJson = useCallback(() => {
    return JSON.stringify(buildBackupPayload(logs, prefsRef.current), null, 2);
  }, [logs]);

  const importBackupJson = useCallback(
    async (raw: string) => {
      const parsed = parseAndValidateBackup(raw);
      const prevIds = logsRef.current.map((l) => l.id);
      await replaceAllLogs(parsed.logs);
      await persistPreferences(parsed.preferences);
      hydrateSilently(parsed.logs, parsed.preferences);
      setAnnouncement(`Imported ${parsed.logs.length} reading log entries.`);

      const uid = userRef.current?.uid;
      if (uid) {
        runCloudWrite(async () => {
          await replaceCloudLogs(uid, parsed.logs, prevIds);
          await saveCloudPreferences(uid, parsed.preferences);
        });
      }
      return parsed.logs.length;
    },
    [hydrateSilently, runCloudWrite]
  );

  const activateDemoJourney = useCallback(async () => {
    const prevIds = logsRef.current.map((l) => l.id);
    const { logs: demoLogs, preferences: demoPrefs } = await seedDemoSanctuary();
    hydrateSilently(demoLogs, demoPrefs);
    setAnnouncement('Loaded sample reading journey.');

    const uid = userRef.current?.uid;
    if (uid) {
      runCloudWrite(() => replaceCloudLogs(uid, demoLogs, prevIds));
    }
  }, [hydrateSilently, runCloudWrite]);

  const resetAllData = useCallback(async () => {
    const prevIds = logsRef.current.map((l) => l.id);
    await clearAllSanctuaryData();
    hydrateSilently([], { ...DEFAULT_PREFERENCES });
    setAnnouncement('Cleared all sanctuary reading logs.');

    const uid = userRef.current?.uid;
    if (uid) {
      runCloudWrite(async () => {
        await replaceCloudLogs(uid, [], prevIds);
        await saveCloudPreferences(uid, { ...DEFAULT_PREFERENCES });
      });
    }
  }, [hydrateSilently, runCloudWrite]);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithGoogleAccount();
    } catch (err) {
      throw new Error(formatAuthError(err));
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    try {
      await signInWithAppleAccount();
    } catch (err) {
      throw new Error(formatAuthError(err));
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAccount(email, password);
    } catch (err) {
      throw new Error(formatAuthError(err));
    }
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName?: string) => {
      try {
        await signUpWithEmailAccount(email, password, displayName);
      } catch (err) {
        throw new Error(formatAuthError(err));
      }
    },
    []
  );

  const updateDisplayName = useCallback(async (displayName: string) => {
    try {
      const updated = await updateAccountDisplayName(displayName);
      setUser(updated);
      userRef.current = updated;
      await saveCloudDisplayName(updated.uid, updated.displayName ?? '');
      setAnnouncement('Updated account display name.');
    } catch (err) {
      throw new Error(formatAuthError(err));
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      await sendAccountPasswordReset(email);
    } catch (err) {
      throw new Error(formatAuthError(err));
    }
  }, []);

  const signOut = useCallback(async () => {
    cloudUnsubRef.current?.();
    cloudUnsubRef.current = null;
    await signOutAccount();
    setLocalOwnerUid(null);
    await clearAllSanctuaryData();
    setUser(null);
    userRef.current = null;
    setPendingMerge(null);
    setSyncStatus('local');
    setSyncError(null);
    setLastSyncedAt(null);
    hydrateSilently([], { ...DEFAULT_PREFERENCES });
    setAnnouncement('Signed out of your Selah account.');
  }, [hydrateSilently]);

  const resolveGuestMerge = useCallback(
    async (strategy: 'merge' | 'cloud-only') => {
      const activeUser = userRef.current;
      const pending = pendingMerge;
      if (!activeUser || !pending) return;

      if (strategy === 'cloud-only') {
        setPendingMerge(null);
        setAnnouncement('Kept your existing cloud reading ledger.');
        return;
      }

      setSyncStatus('syncing');
      setSyncError(null);
      try {
        const cloudLogs = await fetchCloudLogs(activeUser.uid);
        const mergedById = new Map<string, ReadingLogEntry>();
        for (const item of cloudLogs) {
          mergedById.set(item.id, item);
        }
        const toUpload: ReadingLogEntry[] = [];
        for (const guestItem of pending.guestLogs) {
          if (!mergedById.has(guestItem.id)) {
            mergedById.set(guestItem.id, guestItem);
            toUpload.push(guestItem);
          }
        }

        const mergedLogs = [...mergedById.values()];
        const mergedSeen = Array.from(
          new Set([
            ...prefsRef.current.seenAchievementIds,
            ...pending.guestPreferences.seenAchievementIds,
          ])
        ).slice(0, 100);
        const mergedPrefs: UserPreferences = {
          ...prefsRef.current,
          seenAchievementIds: mergedSeen,
        };

        if (toUpload.length > 0) {
          await batchSyncReadingLogs(activeUser.uid, toUpload, []);
        }
        await saveCloudPreferences(activeUser.uid, mergedPrefs);
        await replaceAllLogs(mergedLogs);
        await persistPreferences(mergedPrefs);

        hydrateSilently(mergedLogs, mergedPrefs);
        setPendingMerge(null);
        setSyncStatus('synced');
        setLastSyncedAt(new Date().toISOString());
        setAnnouncement(
          `Merged ${toUpload.length} local ${toUpload.length === 1 ? 'entry' : 'entries'} into your account.`
        );
      } catch (err) {
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        setSyncStatus(offline ? 'offline' : 'error');
        setSyncError(formatCloudError(err));
      }
    },
    [hydrateSilently, pendingMerge]
  );

  const syncNow = useCallback(async () => {
    const activeUser = userRef.current;
    if (!activeUser) return;
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const [cloudUser, cloudLogs] = await Promise.all([
        ensureCloudUserDoc(activeUser, {
          preferences: prefsRef.current,
          colorScheme: colorSchemeRef.current,
        }),
        fetchCloudLogs(activeUser.uid),
      ]);
      hydrateSilently(cloudLogs, cloudUser.preferences);
      await replaceAllLogs(cloudLogs);
      await persistPreferences(cloudUser.preferences);
      if (cloudUser.colorScheme !== colorSchemeRef.current) {
        applyColorScheme(cloudUser.colorScheme);
        setColorSchemeState(cloudUser.colorScheme);
      }
      setSyncStatus('synced');
      setLastSyncedAt(new Date().toISOString());
      setAnnouncement('Sanctuary synced with your cloud account.');
    } catch (err) {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      setSyncStatus(offline ? 'offline' : 'error');
      setSyncError(formatCloudError(err));
    }
  }, [hydrateSilently]);

  const value: BibleStoreValue = {
    ready,
    logs,
    preferences,
    colorScheme,
    summary,
    achievements,
    unlockedQueue,
    announcement,
    firebaseAvailable,
    user,
    authLoading,
    syncStatus,
    syncError,
    lastSyncedAt,
    pendingMerge,
    setColorScheme,
    updatePreferences,
    logChapters,
    toggleChapter,
    markBookComplete,
    clearBookProgress,
    editLog,
    removeLog,
    dismissUnlockedAchievement,
    exportBackupJson,
    importBackupJson,
    activateDemoJourney,
    resetAllData,
    signInWithGoogle,
    signInWithApple,
    signInWithEmail,
    signUpWithEmail,
    updateDisplayName,
    sendPasswordReset,
    signOut,
    resolveGuestMerge,
    syncNow,
  };

  return <BibleStoreContext.Provider value={value}>{children}</BibleStoreContext.Provider>;
};

export function useBibleStore(): BibleStoreValue {
  const ctx = useContext(BibleStoreContext);
  if (!ctx) {
    throw new Error('useBibleStore must be used inside BibleStoreProvider');
  }
  return ctx;
}
