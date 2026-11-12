import { describe, expect, it } from 'vitest';
import {
  BIBLE_BOOKS,
  NT_TOTAL_CHAPTERS,
  OT_TOTAL_CHAPTERS,
  TOTAL_CANON_CHAPTERS,
} from '../data/bibleCanon';
import { READING_PLANS } from '../data/readingPlans';
import {
  computeBibleProgress,
  computeStreaks,
  formatChapterRanges,
  parseChapterInput,
} from '../lib/progress';
import type { ReadingLogEntry } from '../types/bible';

describe('Biblical Canon Dataset', () => {
  it('contains exactly 66 books (39 OT, 27 NT) and 1,189 chapters', () => {
    expect(BIBLE_BOOKS).toHaveLength(66);
    expect(BIBLE_BOOKS.filter((b) => b.testament === 'OT')).toHaveLength(39);
    expect(BIBLE_BOOKS.filter((b) => b.testament === 'NT')).toHaveLength(27);
    expect(OT_TOTAL_CHAPTERS).toBe(929);
    expect(NT_TOTAL_CHAPTERS).toBe(260);
    expect(TOTAL_CANON_CHAPTERS).toBe(1189);
  });

  it('has accurate reading plans covering every intended chapter without duplicates', () => {
    const canonical = READING_PLANS.find((p) => p.id === 'canonical-365')!;
    const canonicalChapters = new Set<string>();
    for (const day of canonical.days) {
      for (const a of day.assignments) {
        for (const ch of a.chapters) {
          canonicalChapters.add(`${a.bookId}:${ch}`);
        }
      }
    }
    expect(canonical.days).toHaveLength(365);
    expect(canonicalChapters.size).toBe(1189);

    const nt90 = READING_PLANS.find((p) => p.id === 'nt-90')!;
    const ntChapters = new Set<string>();
    for (const day of nt90.days) {
      for (const a of day.assignments) {
        for (const ch of a.chapters) {
          ntChapters.add(`${a.bookId}:${ch}`);
        }
      }
    }
    expect(nt90.days).toHaveLength(90);
    expect(ntChapters.size).toBe(260);

    const psProv = READING_PLANS.find((p) => p.id === 'psalms-proverbs-31')!;
    const psChapters = new Set<number>();
    const provChapters = new Set<number>();
    for (const day of psProv.days) {
      for (const a of day.assignments) {
        for (const ch of a.chapters) {
          if (a.bookId === 'psalms') psChapters.add(ch);
          if (a.bookId === 'proverbs') provChapters.add(ch);
        }
      }
    }
    expect(psProv.days).toHaveLength(31);
    expect(psChapters.size).toBe(150);
    expect(provChapters.size).toBe(31);
  });
});

describe('Chapter range formatting and parsing', () => {
  it('formats discontiguous chapters into tidy ranges', () => {
    expect(formatChapterRanges([1, 2, 3, 5, 7, 8, 9])).toBe('1–3, 5, 7–9');
    expect(formatChapterRanges([4, 4, 2])).toBe('2, 4');
    expect(formatChapterRanges([])).toBe('');
  });

  it('parses ranges, singles, and clamps out-of-bounds chapters', () => {
    expect(parseChapterInput('1-3, 5, 99', 10)).toEqual([1, 2, 3, 5]);
    expect(parseChapterInput('4–2', 10)).toEqual([2, 3, 4]);
    expect(parseChapterInput('0, -2, abc', 10)).toEqual([]);
  });
});

describe('Progress and Streak computation', () => {
  it('tracks completed books, multi-pass cycles, and percentages', () => {
    const logs: ReadingLogEntry[] = [
      { id: '1', bookId: 'ruth', chapters: [1, 2, 3, 4], readDate: '2026-11-01', loggedAt: '2026-11-01T07:00:00Z' },
      { id: '2', bookId: 'ruth', chapters: [1, 2, 3, 4], readDate: '2026-11-05', loggedAt: '2026-11-05T07:00:00Z' },
      { id: '3', bookId: 'john', chapters: [1, 2], readDate: '2026-11-06', loggedAt: '2026-11-06T07:00:00Z', note: 'In the beginning' },
    ];

    const summary = computeBibleProgress(logs, { todayIso: '2026-11-06' });
    expect(summary.totalChaptersRead).toBe(6);
    expect(summary.otChaptersRead).toBe(4);
    expect(summary.ntChaptersRead).toBe(2);
    expect(summary.booksCompleted).toBe(1);
    expect(summary.booksInProgress).toBe(1);
    expect(summary.notesCount).toBe(1);
    expect(summary.bookProgressById['ruth'].completedCycles).toBe(2);
    expect(summary.bookProgressById['john'].nextUnreadChapter).toBe(3);
  });

  it('respects strict vs Sabbath grace streak mechanics', () => {
    const datesWithOneGap = ['2026-11-01', '2026-11-02', '2026-11-04', '2026-11-05'];

    const strict = computeStreaks(datesWithOneGap, '2026-11-05', false);
    expect(strict.currentStreak).toBe(2);
    expect(strict.longestStreak).toBe(2);

    const graced = computeStreaks(datesWithOneGap, '2026-11-05', true);
    expect(graced.currentStreak).toBe(4);
    expect(graced.graceUsedThisWeek).toBe(true);
  });
});
