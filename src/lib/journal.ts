import { BOOKS_BY_ID, DIVISIONS, type DivisionMeta } from '../data/bibleCanon';
import type { BibleDivision, ReadingLogEntry } from '../types/bible';
import { diffCalendarDays, formatPlainDate } from './dates';
import { type IndexedReadingLog, matchesIndexedReadingLog } from './logSearch';

export type JournalLens = 'all' | 'reflections' | 'plan-linked';

export interface JournalStats {
  totalSessions: number;
  totalChapterReads: number;
  reflectionsCount: number;
  planLinkedCount: number;
  divisionsPresent: DivisionMeta[];
}

export interface JournalMonthGroup {
  monthKey: string;
  label: string;
  shortLabel: string;
  logs: ReadingLogEntry[];
  sessionCount: number;
  chapterCount: number;
  notesCount: number;
}

/** Computes aggregate reading session, chapter, reflection, and division metrics for the journal header. */
export function computeJournalStats(logs: ReadingLogEntry[]): JournalStats {
  let totalChapterReads = 0;
  let reflectionsCount = 0;
  let planLinkedCount = 0;
  const divisionSet = new Set<BibleDivision>();

  for (const log of logs) {
    const book = BOOKS_BY_ID[log.bookId];
    if (!book) continue;
    totalChapterReads += new Set(log.chapters).size;
    if (log.note && log.note.trim().length > 0) {
      reflectionsCount += 1;
    }
    if (log.planId) {
      planLinkedCount += 1;
    }
    divisionSet.add(book.division);
  }

  return {
    totalSessions: logs.length,
    totalChapterReads,
    reflectionsCount,
    planLinkedCount,
    divisionsPresent: DIVISIONS.filter((d) => divisionSet.has(d.id)),
  };
}

/** Filters pre-indexed reading logs by lens, biblical division, and free-text query. */
export function filterJournalLogs(
  indexedLogs: IndexedReadingLog[],
  filters: {
    query: string;
    lens: JournalLens;
    division: 'ALL' | BibleDivision;
  }
): ReadingLogEntry[] {
  const { query, lens, division } = filters;
  const hasQuery = query.trim().length > 0;

  return indexedLogs
    .filter((entry) => {
      if (lens === 'reflections' && !(entry.log.note && entry.log.note.trim().length > 0)) {
        return false;
      }
      if (lens === 'plan-linked' && !entry.log.planId) {
        return false;
      }
      if (division !== 'ALL') {
        const book = BOOKS_BY_ID[entry.log.bookId];
        if (!book || book.division !== division) {
          return false;
        }
      }
      if (hasQuery && !matchesIndexedReadingLog(entry, query)) {
        return false;
      }
      return true;
    })
    .map((entry) => entry.log);
}

function formatMonthLabels(monthKey: string): { label: string; shortLabel: string } {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    return { label: monthKey, shortLabel: monthKey };
  }
  try {
    const anchorIso = `${monthKey}-01`;
    return {
      label: formatPlainDate(anchorIso, { month: 'long', year: 'numeric' }),
      shortLabel: formatPlainDate(anchorIso, { month: 'short', year: 'numeric' }),
    };
  } catch {
    return { label: monthKey, shortLabel: monthKey };
  }
}

/** Groups pre-sorted reading log entries chronologically by YYYY-MM month sections. */
export function groupLogsByMonth(logs: ReadingLogEntry[]): JournalMonthGroup[] {
  const groups = new Map<string, JournalMonthGroup>();

  for (const log of logs) {
    const monthKey = /^\d{4}-\d{2}/.test(log.readDate) ? log.readDate.slice(0, 7) : 'undated';
    let group = groups.get(monthKey);
    if (!group) {
      const { label, shortLabel } = formatMonthLabels(monthKey);
      group = {
        monthKey,
        label,
        shortLabel,
        logs: [],
        sessionCount: 0,
        chapterCount: 0,
        notesCount: 0,
      };
      groups.set(monthKey, group);
    }
    group.logs.push(log);
    group.sessionCount += 1;
    group.chapterCount += new Set(log.chapters).size;
    if (log.note && log.note.trim().length > 0) {
      group.notesCount += 1;
    }
  }

  return [...groups.values()];
}

/** Returns a subtle Today / Yesterday relative label when a reading date matches recent days. */
export function getRelativeDateCue(readDate: string, todayIso: string): 'Today' | 'Yesterday' | null {
  try {
    const diff = diffCalendarDays(readDate, todayIso);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return null;
  } catch {
    return null;
  }
}
