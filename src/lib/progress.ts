import {
  BIBLE_BOOKS,
  BOOKS_BY_ID,
  NT_TOTAL_CHAPTERS,
  OT_TOTAL_CHAPTERS,
  TOTAL_CANON_CHAPTERS,
} from '../data/bibleCanon';
import type {
  BibleProgressSummary,
  BookProgress,
  ChapterReadState,
  ReadingLogEntry,
} from '../types/bible';
import {
  addDays,
  comparePlainDates,
  diffCalendarDays,
  getDayOfWeek,
  todayPlainDate,
} from './dates';

/**
 * Formats an array of chapter numbers into compact ranges, e.g. [1,2,3,5,7,8] -> "1–3, 5, 7–8".
 */
export function formatChapterRanges(chapters: number[]): string {
  if (chapters.length === 0) return '';
  const sorted = [...new Set(chapters)].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i];
    if (curr === prev + 1) {
      prev = curr;
    } else {
      ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
      start = curr;
      prev = curr;
    }
  }
  ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
  return ranges.join(', ');
}

/**
 * Parses a chapter expression like "1-5, 8, 10-12" bounded by maxChapter.
 */
export function parseChapterInput(input: string, maxChapter: number): number[] {
  const result = new Set<number>();
  const parts = input
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
    if (rangeMatch) {
      const a = Number(rangeMatch[1]);
      const b = Number(rangeMatch[2]);
      const lo = Math.max(1, Math.min(a, b));
      const hi = Math.min(maxChapter, Math.max(a, b));
      for (let ch = lo; ch <= hi; ch++) {
        result.add(ch);
      }
      continue;
    }
    const single = Number(part);
    if (Number.isInteger(single) && single >= 1 && single <= maxChapter) {
      result.add(single);
    }
  }

  return [...result].sort((a, b) => a - b);
}

/**
 * Calculates current & longest reading streaks from unique calendar dates.
 * When `graceEnabled` is true, up to 1 missed day inside any 7-day rolling window
 * preserves the streak (Sabbath/rest grace).
 */
export function computeStreaks(
  uniqueSortedDatesAsc: string[],
  todayIso: string,
  graceEnabled: boolean
): { currentStreak: number; longestStreak: number; graceUsedThisWeek: boolean } {
  const activeDates = uniqueSortedDatesAsc.filter((d) => comparePlainDates(d, todayIso) <= 0);
  if (activeDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, graceUsedThisWeek: false };
  }

  const dateSet = new Set(activeDates);

  // Compute longest streak across all historical reading dates
  let longestStreak = 0;
  const startDate = activeDates[0];
  const endDate = activeDates[activeDates.length - 1];
  const totalSpan = diffCalendarDays(startDate, endDate);

  if (!graceEnabled) {
    let run = 0;
    let prevDate: string | null = null;
    for (const d of activeDates) {
      if (prevDate && diffCalendarDays(prevDate, d) === 1) {
        run += 1;
      } else {
        run = 1;
      }
      if (run > longestStreak) longestStreak = run;
      prevDate = d;
    }
  } else {
    // Walk day-by-day across active span allowing at most 1 missed day per 7-day window
    const missedOffsets: number[] = [];
    let run = 0;
    for (let offset = 0; offset <= totalSpan; offset++) {
      const cursor = addDays(startDate, offset);
      if (dateSet.has(cursor)) {
        run += 1;
      } else {
        // Only bridge a gap if there is at least one future read after a 1-day gap
        // and the previous missed day wasn't within the last 6 days
        const lastMissed = missedOffsets[missedOffsets.length - 1];
        const canGrace =
          (lastMissed === undefined || offset - lastMissed >= 7) &&
          dateSet.has(addDays(cursor, 1));
        if (canGrace && run > 0) {
          missedOffsets.push(offset);
        } else {
          run = 0;
        }
      }
      if (run > longestStreak) longestStreak = run;
    }
  }

  // Compute current streak walking backwards from today (or yesterday if not yet read today)
  let currentStreak = 0;
  let graceUsedThisWeek = false;
  let cursor = todayIso;
  const hasToday = dateSet.has(todayIso);
  const yesterday = addDays(todayIso, -1);
  const hasYesterday = dateSet.has(yesterday);

  if (!hasToday && !hasYesterday) {
    if (!graceEnabled) {
      return { currentStreak: 0, longestStreak, graceUsedThisWeek: false };
    }
    const twoDaysAgo = addDays(todayIso, -2);
    if (!dateSet.has(twoDaysAgo)) {
      return { currentStreak: 0, longestStreak, graceUsedThisWeek: false };
    }
    // Yesterday was missed; today isn't logged yet, treat yesterday as the grace gap
    cursor = twoDaysAgo;
    graceUsedThisWeek = true;
  } else if (!hasToday && hasYesterday) {
    cursor = yesterday;
  }

  // Walk backward counting active reading days
  const recentMissDays: number[] = [];
  let stepsBack = 0;

  while (true) {
    if (dateSet.has(cursor)) {
      currentStreak += 1;
      stepsBack += 1;
      cursor = addDays(cursor, -1);
    } else if (graceEnabled) {
      // Allow bridging a 1-day gap if no other missed day occurred within 7 days
      const prevMiss = recentMissDays[recentMissDays.length - 1];
      const dayBefore = addDays(cursor, -1);
      const withinWeeklyBudget = prevMiss === undefined || stepsBack - prevMiss >= 7;
      if (withinWeeklyBudget && dateSet.has(dayBefore)) {
        recentMissDays.push(stepsBack);
        if (stepsBack < 7) {
          graceUsedThisWeek = true;
        }
        stepsBack += 1;
        cursor = dayBefore;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  return { currentStreak, longestStreak, graceUsedThisWeek };
}

export function computeBibleProgress(
  logs: ReadingLogEntry[],
  options: { todayIso?: string; streakGraceEnabled?: boolean } = {}
): BibleProgressSummary {
  const todayIso = options.todayIso ?? todayPlainDate();
  const streakGraceEnabled = options.streakGraceEnabled ?? true;

  // Sort chronological so firstReadDate / lastReadDate & lastReadBookId resolve accurately
  const sortedLogs = [...logs].sort((a, b) => {
    const cmp = comparePlainDates(a.readDate, b.readDate);
    if (cmp !== 0) return cmp;
    return a.loggedAt.localeCompare(b.loggedAt);
  });

  const bookChapterMaps: Record<string, Record<number, ChapterReadState>> = {};
  for (const book of BIBLE_BOOKS) {
    bookChapterMaps[book.id] = {};
  }

  let totalChapterReadsAllCycles = 0;
  let notesCount = 0;
  const activeDatesSet = new Set<string>();

  for (const log of sortedLogs) {
    const book = BOOKS_BY_ID[log.bookId];
    if (!book) continue;

    activeDatesSet.add(log.readDate);
    if (log.note && log.note.trim().length > 0) {
      notesCount += 1;
    }

    const chMap = bookChapterMaps[book.id];
    const uniqueChapters = new Set(
      log.chapters.filter((ch) => Number.isInteger(ch) && ch >= 1 && ch <= book.chapterCount)
    );

    for (const ch of uniqueChapters) {
      totalChapterReadsAllCycles += 1;
      const existing = chMap[ch];
      if (!existing) {
        chMap[ch] = {
          readCount: 1,
          firstReadDate: log.readDate,
          lastReadDate: log.readDate,
        };
      } else {
        existing.readCount += 1;
        if (comparePlainDates(log.readDate, existing.firstReadDate) < 0) {
          existing.firstReadDate = log.readDate;
        }
        if (comparePlainDates(log.readDate, existing.lastReadDate) > 0) {
          existing.lastReadDate = log.readDate;
        }
      }
    }
  }

  const bookProgressById: Record<string, BookProgress> = {};
  let totalChaptersRead = 0;
  let otChaptersRead = 0;
  let ntChaptersRead = 0;
  let booksCompleted = 0;
  let booksInProgress = 0;

  for (const book of BIBLE_BOOKS) {
    const chapterMap = bookChapterMaps[book.id];
    const readCountKeys = Object.keys(chapterMap);
    const readChapters = readCountKeys.length;
    const completed = readChapters === book.chapterCount;

    let completedCycles = 0;
    if (completed) {
      completedCycles = Math.min(
        ...Array.from({ length: book.chapterCount }, (_, idx) => chapterMap[idx + 1]?.readCount ?? 0)
      );
    }

    let nextUnreadChapter: number | null = null;
    for (let ch = 1; ch <= book.chapterCount; ch++) {
      if (!chapterMap[ch]) {
        nextUnreadChapter = ch;
        break;
      }
    }

    totalChaptersRead += readChapters;
    if (book.testament === 'OT') {
      otChaptersRead += readChapters;
    } else {
      ntChaptersRead += readChapters;
    }
    if (completed) {
      booksCompleted += 1;
    } else if (readChapters > 0) {
      booksInProgress += 1;
    }

    bookProgressById[book.id] = {
      book,
      readChapters,
      totalChapters: book.chapterCount,
      percentage: (readChapters / book.chapterCount) * 100,
      completed,
      completedCycles,
      chapterMap,
      nextUnreadChapter,
    };
  }

  const uniqueDatesAsc = [...activeDatesSet].sort(comparePlainDates);
  const { currentStreak, longestStreak, graceUsedThisWeek } = computeStreaks(
    uniqueDatesAsc,
    todayIso,
    streakGraceEnabled
  );

  // Rolling 28-day pace for projected completion
  const windowStart = addDays(todayIso, -27);
  let recentChapters = 0;
  for (const log of sortedLogs) {
    if (
      comparePlainDates(log.readDate, windowStart) >= 0 &&
      comparePlainDates(log.readDate, todayIso) <= 0
    ) {
      recentChapters += new Set(log.chapters).size;
    }
  }
  const chaptersPerWeekAvg = Number(((recentChapters / 28) * 7).toFixed(1));

  let projectedFinishDate: string | null = null;
  const remainingChapters = TOTAL_CANON_CHAPTERS - totalChaptersRead;
  if (remainingChapters === 0) {
    projectedFinishDate = todayIso;
  } else if (chaptersPerWeekAvg > 0) {
    const chaptersPerDay = chaptersPerWeekAvg / 7;
    const daysNeeded = Math.ceil(remainingChapters / chaptersPerDay);
    if (daysNeeded <= 3650) {
      projectedFinishDate = addDays(todayIso, daysNeeded);
    }
  }

  const lastLog = sortedLogs[sortedLogs.length - 1] ?? null;

  return {
    totalChaptersRead,
    totalChapters: TOTAL_CANON_CHAPTERS,
    totalPercentage: (totalChaptersRead / TOTAL_CANON_CHAPTERS) * 100,
    otChaptersRead,
    otTotalChapters: OT_TOTAL_CHAPTERS,
    otPercentage: (otChaptersRead / OT_TOTAL_CHAPTERS) * 100,
    ntChaptersRead,
    ntTotalChapters: NT_TOTAL_CHAPTERS,
    ntPercentage: (ntChaptersRead / NT_TOTAL_CHAPTERS) * 100,
    booksCompleted,
    booksInProgress,
    totalSessions: logs.length,
    totalChapterReadsAllCycles,
    notesCount,
    currentStreak,
    longestStreak,
    graceUsedThisWeek,
    activeDaysCount: uniqueDatesAsc.length,
    chaptersPerWeekAvg,
    projectedFinishDate,
    lastReadBookId: lastLog?.bookId ?? null,
    bookProgressById,
  };
}

/**
 * Returns daily chapter count map (YYYY-MM-DD -> chapters read) for heatmaps & charts.
 */
export function buildDailyChapterCounts(logs: ReadingLogEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const log of logs) {
    const count = new Set(log.chapters).size;
    counts[log.readDate] = (counts[log.readDate] ?? 0) + count;
  }
  return counts;
}

/**
 * Counts consecutive Sunday readings up to the latest Sunday with data.
 */
export function countConsecutiveSundays(logs: ReadingLogEntry[]): number {
  const sundayDates = new Set<string>();
  for (const log of logs) {
    if (getDayOfWeek(log.readDate) === 7) {
      sundayDates.add(log.readDate);
    }
  }
  if (sundayDates.size === 0) return 0;

  const sorted = [...sundayDates].sort(comparePlainDates);
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (diffCalendarDays(sorted[i - 1], sorted[i]) === 7) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}
