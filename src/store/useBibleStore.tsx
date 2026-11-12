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
  addReadingLog,
  buildBackupPayload,
  clearAllSanctuaryData,
  DEFAULT_PREFERENCES,
  deleteReadingLog,
  loadSanctuaryState,
  parseAndValidateBackup,
  persistPreferences,
  removeChaptersFromBookLogs,
  replaceAllLogs,
  seedDemoSanctuary,
  updateReadingLog,
} from '../db/repository';
import { evaluateAchievements } from '../lib/achievementsEngine';
import { celebrateAchievementUnlocked, celebrateBookCompleted } from '../lib/celebration';
import { todayPlainDate } from '../lib/dates';
import { computeBibleProgress, formatChapterRanges } from '../lib/progress';
import {
  applyColorScheme,
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

interface BibleStoreValue {
  ready: boolean;
  logs: ReadingLogEntry[];
  preferences: UserPreferences;
  colorScheme: ColorSchemePreference;
  summary: BibleProgressSummary;
  achievements: AchievementStatus[];
  unlockedQueue: AchievementStatus[];
  announcement: string;
  setColorScheme: (pref: ColorSchemePreference) => void;
  updatePreferences: (patch: Partial<UserPreferences>) => Promise<void>;
  logChapters: (input: {
    bookId: string;
    chapters: number[];
    readDate?: string;
    note?: string;
    planId?: string;
  }) => Promise<void>;
  toggleChapter: (bookId: string, chapter: number, options?: { rereadMode?: boolean; readDate?: string }) => Promise<void>;
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
}

const BibleStoreContext = createContext<BibleStoreValue | null>(null);

export const BibleStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [logs, setLogs] = useState<ReadingLogEntry[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({ ...DEFAULT_PREFERENCES });
  const [colorScheme, setColorSchemeState] = useState<ColorSchemePreference>(() =>
    getStoredColorScheme()
  );
  const [unlockedQueue, setUnlockedQueue] = useState<AchievementStatus[]>([]);
  const [announcement, setAnnouncement] = useState('');

  const prevUnlockedSetRef = useRef<Set<string> | null>(null);
  const prefsRef = useRef<UserPreferences>(preferences);
  prefsRef.current = preferences;

  useEffect(() => {
    const unsubscribe = subscribeColorSchemeChanges((next) => {
      setColorSchemeState(next);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let active = true;
    void loadSanctuaryState().then(({ logs: loadedLogs, preferences: loadedPrefs }) => {
      if (!active) return;
      const initialSummary = computeBibleProgress(loadedLogs, {
        streakGraceEnabled: loadedPrefs.streakGraceEnabled,
      });
      const initialAchievements = evaluateAchievements(loadedLogs, initialSummary);
      const alreadyUnlocked = new Set(
        initialAchievements.filter((a) => a.unlocked).map((a) => a.definition.id)
      );
      prevUnlockedSetRef.current = alreadyUnlocked;
      setLogs(loadedLogs);
      setPreferences(loadedPrefs);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

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

  const setColorScheme = useCallback((pref: ColorSchemePreference) => {
    applyColorScheme(pref);
    setColorSchemeState(pref);
  }, []);

  const updatePreferences = useCallback(async (patch: Partial<UserPreferences>) => {
    const next = { ...prefsRef.current, ...patch };
    setPreferences(next);
    await persistPreferences(next);
  }, []);

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

      const wasCompletedBefore = summary.bookProgressById[book.id]?.completed ?? false;
      const entry = await addReadingLog(input);
      const nextLogs = [...logs, entry];
      setLogs(nextLogs);

      const nextSummary = computeBibleProgress(nextLogs, {
        streakGraceEnabled: prefsRef.current.streakGraceEnabled,
      });
      const isNowCompleted = nextSummary.bookProgressById[book.id]?.completed ?? false;
      if (!wasCompletedBefore && isNowCompleted) {
        celebrateBookCompleted(prefsRef.current.celebrationsEnabled);
      }

      setAnnouncement(
        `Logged ${book.name} ${formatChapterRanges(entry.chapters)}.`
      );
    },
    [logs, summary.bookProgressById]
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
        const nextLogs = await removeChaptersFromBookLogs(bookId, [chapter]);
        setLogs(nextLogs);
        setAnnouncement(`Removed ${book.name} chapter ${chapter} from your logs.`);
      }
    },
    [logChapters, summary.bookProgressById]
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
      const allChapters = Array.from({ length: book.chapterCount }, (_, idx) => idx + 1);
      const nextLogs = await removeChaptersFromBookLogs(bookId, allChapters);
      setLogs(nextLogs);
      setAnnouncement(`Cleared reading logs for ${book.name}.`);
    },
    []
  );

  const editLog = useCallback(
    async (
      id: string,
      patch: Partial<Pick<ReadingLogEntry, 'chapters' | 'readDate' | 'note'>>
    ) => {
      await updateReadingLog(id, patch);
      setLogs((prev) =>
        prev.map((l) =>
          l.id === id
            ? {
                ...l,
                ...patch,
                chapters: patch.chapters
                  ? [...new Set(patch.chapters)].sort((a, b) => a - b)
                  : l.chapters,
                note: patch.note !== undefined ? patch.note.trim() || undefined : l.note,
              }
            : l
        )
      );
      setAnnouncement('Updated reading log entry.');
    },
    []
  );

  const removeLog = useCallback(async (id: string) => {
    await deleteReadingLog(id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
    setAnnouncement('Deleted reading log entry.');
  }, []);

  const dismissUnlockedAchievement = useCallback((id: string) => {
    setUnlockedQueue((prev) => prev.filter((item) => item.definition.id !== id));
  }, []);

  const exportBackupJson = useCallback(() => {
    return JSON.stringify(buildBackupPayload(logs, prefsRef.current), null, 2);
  }, [logs]);

  const importBackupJson = useCallback(async (raw: string) => {
    const parsed = parseAndValidateBackup(raw);
    const nextSummary = computeBibleProgress(parsed.logs, {
      streakGraceEnabled: parsed.preferences.streakGraceEnabled,
    });
    const nextAchievements = evaluateAchievements(parsed.logs, nextSummary);
    prevUnlockedSetRef.current = new Set(
      nextAchievements.filter((a) => a.unlocked).map((a) => a.definition.id)
    );
    await replaceAllLogs(parsed.logs);
    await persistPreferences(parsed.preferences);
    setLogs(parsed.logs);
    setPreferences(parsed.preferences);
    setUnlockedQueue([]);
    setAnnouncement(`Imported ${parsed.logs.length} reading log entries.`);
    return parsed.logs.length;
  }, []);

  const activateDemoJourney = useCallback(async () => {
    const { logs: demoLogs, preferences: demoPrefs } = await seedDemoSanctuary();
    const nextSummary = computeBibleProgress(demoLogs, {
      streakGraceEnabled: demoPrefs.streakGraceEnabled,
    });
    const nextAchievements = evaluateAchievements(demoLogs, nextSummary);
    prevUnlockedSetRef.current = new Set(
      nextAchievements.filter((a) => a.unlocked).map((a) => a.definition.id)
    );
    setLogs(demoLogs);
    setUnlockedQueue([]);
    setAnnouncement('Loaded sample reading journey.');
  }, []);

  const resetAllData = useCallback(async () => {
    await clearAllSanctuaryData();
    prevUnlockedSetRef.current = new Set();
    setLogs([]);
    setPreferences({ ...DEFAULT_PREFERENCES });
    setUnlockedQueue([]);
    setAnnouncement('Cleared all sanctuary reading logs.');
  }, []);

  const value: BibleStoreValue = {
    ready,
    logs,
    preferences,
    colorScheme,
    summary,
    achievements,
    unlockedQueue,
    announcement,
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
