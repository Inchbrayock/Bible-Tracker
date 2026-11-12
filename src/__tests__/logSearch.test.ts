import { describe, expect, it } from 'vitest';
import { BOOKS_BY_ID } from '../data/bibleCanon';
import { matchesReadingLogQuery } from '../lib/logSearch';
import type { ReadingLogEntry } from '../types/bible';

const SAMPLE_LOGS: ReadingLogEntry[] = [
  {
    id: 'rom-1',
    bookId: 'romans',
    chapters: [1, 2, 3],
    readDate: '2026-11-06',
    loggedAt: '2026-11-06T07:00:00Z',
  },
  {
    id: 'rom-4',
    bookId: 'romans',
    chapters: [4, 5, 6],
    readDate: '2026-11-07',
    loggedAt: '2026-11-07T07:00:00Z',
    note: 'Justified by faith, we have peace with God.',
  },
  {
    id: 'rom-14',
    bookId: 'romans',
    chapters: [14, 15, 16],
    readDate: '2026-11-12',
    loggedAt: '2026-11-12T07:00:00Z',
    note: 'Finished Romans! May the God of hope fill you with all joy.',
  },
  {
    id: 'ps-23',
    bookId: 'psalms',
    chapters: [23, 27, 34, 42, 46],
    readDate: '2026-09-15',
    loggedAt: '2026-09-15T07:00:00Z',
    note: 'Be still and know that I am God.',
  },
  {
    id: 'ps-119',
    bookId: 'psalms',
    chapters: [103, 119, 121, 139],
    readDate: '2026-11-04',
    loggedAt: '2026-11-04T21:00:00Z',
    note: 'Psalm 119 — delighting in every stanza of God’s word.',
  },
  {
    id: 'jn-1',
    bookId: 'john',
    chapters: [1, 2, 3, 4, 5, 6, 7],
    readDate: '2026-10-19',
    loggedAt: '2026-10-19T06:00:00Z',
  },
  {
    id: '1jn-1',
    bookId: '1-john',
    chapters: [1, 2, 3],
    readDate: '2026-11-02',
    loggedAt: '2026-11-02T07:00:00Z',
  },
  {
    id: 'jas-1',
    bookId: 'james',
    chapters: [1, 2],
    readDate: '2026-11-05',
    loggedAt: '2026-11-05T07:00:00Z',
  },
];

function matchingIds(query: string): string[] {
  return SAMPLE_LOGS.filter((log) =>
    matchesReadingLogQuery(log, BOOKS_BY_ID[log.bookId], query)
  ).map((l) => l.id);
}

describe('Reading Log History Search', () => {
  it('matches book names, short abbreviations, and aliases', () => {
    expect(matchingIds('Romans')).toEqual(['rom-1', 'rom-4', 'rom-14']);
    expect(matchingIds('Rom')).toEqual(['rom-1', 'rom-4', 'rom-14']);
    expect(matchingIds('Jas')).toEqual(['jas-1']);
    expect(matchingIds('Ps')).toEqual(['ps-23', 'ps-119']);
    expect(matchingIds('1 John')).toEqual(['1jn-1']);
  });

  it('matches book + chapter and chapter ranges without colliding with year/day digits', () => {
    expect(matchingIds('Romans 2')).toEqual(['rom-1']);
    expect(matchingIds('Romans 6')).toEqual(['rom-4']);
    expect(matchingIds('Romans 15')).toEqual(['rom-14']);
    expect(matchingIds('Romans 14-16')).toEqual(['rom-14']);
    expect(matchingIds('Romans 14–16')).toEqual(['rom-14']);
    expect(matchingIds('Romans 1 - 3')).toEqual(['rom-1']);
    expect(matchingIds('Psalm 23')).toEqual(['ps-23']);
    expect(matchingIds('Rom. 15')).toEqual(['rom-14']);
    expect(matchingIds('1 John 2')).toEqual(['1jn-1']);
    expect(matchingIds('John 1')).toEqual(['jn-1', '1jn-1']);
  });

  it('matches displayed human dates, full months, slash dates, and ISO dates', () => {
    expect(matchingIds('Nov 12')).toEqual(['rom-14']);
    expect(matchingIds('Nov 12, 2026')).toEqual(['rom-14']);
    expect(matchingIds('November 12')).toEqual(['rom-14']);
    expect(matchingIds('12 Nov')).toEqual(['rom-14']);
    expect(matchingIds('5 Nov')).toEqual(['jas-1']);
    expect(matchingIds('Sept 15')).toEqual(['ps-23']);
    expect(matchingIds('October')).toEqual(['jn-1']);
    expect(matchingIds('11/12/2026')).toEqual(['rom-14']);
    expect(matchingIds('11/5')).toEqual(['jas-1']);
    expect(matchingIds('2026-10-19')).toEqual(['jn-1']);
    expect(matchingIds('Nov 2026')).toEqual(['rom-1', 'rom-4', 'rom-14', 'ps-119', '1jn-1', 'jas-1']);
  });

  it('matches reflection notes with curly apostrophes, dashes, and multi-term cross-field queries', () => {
    expect(matchingIds("God's word")).toEqual(['ps-119']);
    expect(matchingIds('Psalm 119 - delighting')).toEqual(['ps-119']);
    expect(matchingIds('Romans peace')).toEqual(['rom-4']);
    expect(matchingIds('Romans Nov 12')).toEqual(['rom-14']);
    expect(matchingIds('Psalms Sept')).toEqual(['ps-23']);
    expect(matchingIds('nonexistent query')).toEqual([]);
  });
});
