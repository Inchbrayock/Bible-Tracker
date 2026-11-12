import { describe, expect, it } from 'vitest';
import { BIBLE_BOOKS } from '../data/bibleCanon';
import { evaluateAchievements } from '../lib/achievementsEngine';
import { computeBibleProgress } from '../lib/progress';
import type { ReadingLogEntry } from '../types/bible';

describe('Achievement Engine', () => {
  it('unlocks secret Psalm 119 seal, Gospels witness, and re-read seals accurately', () => {
    const gospelsLogs: ReadingLogEntry[] = [
      { id: 'm', bookId: 'matthew', chapters: Array.from({ length: 28 }, (_, i) => i + 1), readDate: '2026-11-01', loggedAt: '2026-11-01T06:00:00Z' },
      { id: 'mk', bookId: 'mark', chapters: Array.from({ length: 16 }, (_, i) => i + 1), readDate: '2026-11-02', loggedAt: '2026-11-02T06:00:00Z' },
      { id: 'lk', bookId: 'luke', chapters: Array.from({ length: 24 }, (_, i) => i + 1), readDate: '2026-11-03', loggedAt: '2026-11-03T06:00:00Z' },
      { id: 'jn', bookId: 'john', chapters: Array.from({ length: 21 }, (_, i) => i + 1), readDate: '2026-11-04', loggedAt: '2026-11-04T06:00:00Z' },
      { id: 'ps119', bookId: 'psalms', chapters: [119], readDate: '2026-11-05', loggedAt: '2026-11-05T06:00:00Z' },
      { id: 'ob1', bookId: 'obadiah', chapters: [1], readDate: '2026-11-06', loggedAt: '2026-11-06T06:00:00Z' },
      { id: 'ob2', bookId: 'obadiah', chapters: [1], readDate: '2026-11-07', loggedAt: '2026-11-07T06:00:00Z' },
    ];

    const summary = computeBibleProgress(gospelsLogs, { todayIso: '2026-11-07' });
    const statuses = evaluateAchievements(gospelsLogs, summary);
    const byId = Object.fromEntries(statuses.map((s) => [s.definition.id, s]));

    expect(byId['first-scroll'].unlocked).toBe(true);
    expect(byId['witness-of-gospels'].unlocked).toBe(true);
    expect(byId['longest-song'].unlocked).toBe(true);
    expect(byId['second-wind'].unlocked).toBe(true);
    expect(byId['sevenfold-light'].unlocked).toBe(true);
    expect(byId['alpha-and-omega'].unlocked).toBe(false);
  });

  it('unlocks Alpha & Omega when all 1,189 chapters are read', () => {
    const allLogs: ReadingLogEntry[] = BIBLE_BOOKS.map((book, idx) => ({
      id: `full-${book.id}`,
      bookId: book.id,
      chapters: Array.from({ length: book.chapterCount }, (_, i) => i + 1),
      readDate: '2026-11-12',
      loggedAt: `2026-11-12T10:${String(idx % 59).padStart(2, '0')}:00Z`,
    }));

    const summary = computeBibleProgress(allLogs, { todayIso: '2026-11-12' });
    expect(summary.totalChaptersRead).toBe(1189);
    const statuses = evaluateAchievements(allLogs, summary);
    const alphaOmega = statuses.find((s) => s.definition.id === 'alpha-and-omega')!;
    expect(alphaOmega.unlocked).toBe(true);
    expect(alphaOmega.percentage).toBe(100);
  });
});
