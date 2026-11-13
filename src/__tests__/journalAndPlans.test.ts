import { describe, expect, it } from 'vitest';
import { BOOKS_BY_ID } from '../data/bibleCanon';
import { CORE_DEFAULT_PLAN_IDS, READING_PLANS } from '../data/readingPlans';
import {
  computeSectionsChapterCount,
  decodeCustomPlanSections,
  encodeCustomPlanSections,
  extractSectionsFromPlan,
  materializeCustomPlan,
  sanitizeCustomPlanDefinition,
} from '../lib/customPlans';
import {
  computeJournalStats,
  filterJournalLogs,
  getRelativeDateCue,
  groupLogsByMonth,
} from '../lib/journal';
import { indexReadingLogForSearch } from '../lib/logSearch';
import {
  buildPlanStages,
  computePlanProgress,
  DEFAULT_PLAN_FINDER_FILTERS,
  filterReadingPlans,
  getPlanCoverageMeta,
  getShelfPlans,
  matchPlanDayNotes,
  sanitizeShelfPlanIds,
} from '../lib/plans';
import { computeBibleProgress } from '../lib/progress';
import type { CustomPlanDefinition, ReadingLogEntry } from '../types/bible';

const SAMPLE_LOGS: ReadingLogEntry[] = [
  {
    id: 'l1',
    bookId: 'romans',
    chapters: [14, 15, 16],
    readDate: '2026-11-13',
    loggedAt: '2026-11-13T07:00:00Z',
    note: 'May the God of hope fill you with all joy and peace.',
    planId: 'nt-90',
  },
  {
    id: 'l2',
    bookId: 'proverbs',
    chapters: [1],
    readDate: '2026-11-12',
    loggedAt: '2026-11-12T07:00:00Z',
    planId: 'psalms-proverbs-31',
  },
  {
    id: 'l3',
    bookId: 'psalms',
    chapters: [23, 27],
    readDate: '2026-10-28',
    loggedAt: '2026-10-28T07:00:00Z',
    note: 'The Lord is my shepherd; quiet stillness.',
  },
];

describe('Journal helpers', () => {
  it('computes journal stats and canonical divisions present', () => {
    const stats = computeJournalStats(SAMPLE_LOGS);
    expect(stats.totalSessions).toBe(3);
    expect(stats.totalChapterReads).toBe(6);
    expect(stats.reflectionsCount).toBe(2);
    expect(stats.planLinkedCount).toBe(2);
    expect(stats.divisionsPresent.map((d) => d.id)).toEqual(['wisdom', 'pauline']);
  });

  it('filters journal logs by lens, division, and query', () => {
    const indexed = SAMPLE_LOGS.map((log) =>
      indexReadingLogForSearch(log, BOOKS_BY_ID[log.bookId])
    );

    expect(filterJournalLogs(indexed, { query: '', lens: 'all', division: 'ALL' })).toHaveLength(3);
    expect(
      filterJournalLogs(indexed, { query: '', lens: 'reflections', division: 'ALL' }).map(
        (l) => l.id
      )
    ).toEqual(['l1', 'l3']);
    expect(
      filterJournalLogs(indexed, { query: '', lens: 'plan-linked', division: 'ALL' }).map(
        (l) => l.id
      )
    ).toEqual(['l1', 'l2']);
    expect(
      filterJournalLogs(indexed, { query: '', lens: 'all', division: 'wisdom' }).map((l) => l.id)
    ).toEqual(['l2', 'l3']);
    expect(
      filterJournalLogs(indexed, { query: 'shepherd', lens: 'reflections', division: 'wisdom' }).map(
        (l) => l.id
      )
    ).toEqual(['l3']);
  });

  it('groups logs chronologically by month with counts and relative date cues', () => {
    const groups = groupLogsByMonth(SAMPLE_LOGS);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      monthKey: '2026-11',
      label: 'November 2026',
      sessionCount: 2,
      chapterCount: 4,
      notesCount: 1,
    });
    expect(groups[1]).toMatchObject({
      monthKey: '2026-10',
      label: 'October 2026',
      sessionCount: 1,
      chapterCount: 2,
      notesCount: 1,
    });

    expect(getRelativeDateCue('2026-11-13', '2026-11-13')).toBe('Today');
    expect(getRelativeDateCue('2026-11-12', '2026-11-13')).toBe('Yesterday');
    expect(getRelativeDateCue('2026-10-28', '2026-11-13')).toBeNull();
  });
});

describe('Enhanced reading plan progress and stages', () => {
  it('tracks partial days and per-assignment completion counts', () => {
    const psProv = READING_PLANS.find((p) => p.id === 'psalms-proverbs-31')!;
    const summary = computeBibleProgress(SAMPLE_LOGS, { todayIso: '2026-11-13' });
    const progress = computePlanProgress(psProv, summary);

    // Day 1 is Psalms 1-5 + Proverbs 1; Proverbs 1 is read so Day 1 is partial
    const day1 = progress.dayStatuses[0];
    expect(day1.done).toBe(false);
    expect(day1.partial).toBe(true);
    expect(day1.readChaptersCount).toBe(1);
    expect(day1.totalChaptersCount).toBe(6);
    expect(day1.assignmentStatuses[0]).toMatchObject({
      bookId: 'psalms',
      readChaptersCount: 0,
      totalChaptersCount: 5,
      done: false,
    });
    expect(day1.assignmentStatuses[1]).toMatchObject({
      bookId: 'proverbs',
      readChaptersCount: 1,
      totalChaptersCount: 1,
      done: true,
    });
    expect(progress.partialDaysCount).toBeGreaterThanOrEqual(1);
  });

  it('builds balanced stages across 31, 45, 90, and 365 day plans', () => {
    const emptySummary = computeBibleProgress([], { todayIso: '2026-11-13' });

    const ps31 = READING_PLANS.find((p) => p.id === 'psalms-proverbs-31')!;
    const st31 = buildPlanStages(ps31, computePlanProgress(ps31, emptySummary).dayStatuses);
    expect(st31).toHaveLength(5);
    expect(st31.reduce((acc, s) => acc + s.days.length, 0)).toBe(31);

    const ga45 = READING_PLANS.find((p) => p.id === 'gospels-acts-45')!;
    const st45 = buildPlanStages(ga45, computePlanProgress(ga45, emptySummary).dayStatuses);
    expect(st45).toHaveLength(7);
    expect(st45.reduce((acc, s) => acc + s.days.length, 0)).toBe(45);

    const nt90 = READING_PLANS.find((p) => p.id === 'nt-90')!;
    const st90 = buildPlanStages(nt90, computePlanProgress(nt90, emptySummary).dayStatuses);
    expect(st90).toHaveLength(6);
    expect(st90.reduce((acc, s) => acc + s.days.length, 0)).toBe(90);

    const yr365 = READING_PLANS.find((p) => p.id === 'canonical-365')!;
    const st365 = buildPlanStages(yr365, computePlanProgress(yr365, emptySummary).dayStatuses);
    expect(st365).toHaveLength(12);
    expect(st365.reduce((acc, s) => acc + s.days.length, 0)).toBe(365);
    expect(getPlanCoverageMeta(yr365)).toEqual({
      bookCount: 66,
      totalChapters: 1189,
      avgChaptersPerDay: '3.3',
    });
  });

  it('matches reflection notes to plan days and prioritizes explicit planId matches', () => {
    const nt90 = READING_PLANS.find((p) => p.id === 'nt-90')!;
    const romans14Day = nt90.days.find((d) =>
      d.assignments.some((a) => a.bookId === 'romans' && a.chapters.includes(14))
    )!;

    const logs: ReadingLogEntry[] = [
      {
        id: 'other',
        bookId: 'romans',
        chapters: [14],
        readDate: '2026-11-13',
        loggedAt: '2026-11-13T10:00:00Z',
        note: 'Freeform note on Romans 14',
      },
      {
        id: 'plan-match',
        bookId: 'romans',
        chapters: [14],
        readDate: '2026-11-10',
        loggedAt: '2026-11-10T07:00:00Z',
        note: 'Plan reflection on Romans 14',
        planId: 'nt-90',
      },
    ];

    const notesByDay = matchPlanDayNotes(nt90, logs);
    expect(notesByDay[romans14Day.day]?.map((l) => l.id)).toEqual(['plan-match', 'other']);
  });
});

describe('Expanded plan library, Plan Finder, and Custom Plans', () => {
  it('verifies all 12 curated plans have valid days and exact unique chapter counts', () => {
    expect(READING_PLANS.length).toBeGreaterThanOrEqual(12);

    const wholeBibleIds = ['canonical-365', 'chronological-365', 'ot-nt-paired-365'];
    for (const planId of wholeBibleIds) {
      const plan = READING_PLANS.find((p) => p.id === planId)!;
      expect(plan).toBeDefined();
      expect(plan.days).toHaveLength(365);

      const seen = new Set<string>();
      for (const day of plan.days) {
        for (const a of day.assignments) {
          for (const ch of a.chapters) {
            const key = `${a.bookId}:${ch}`;
            expect(seen.has(key)).toBe(false);
            seen.add(key);
          }
        }
      }
      expect(seen.size).toBe(1189);
    }

    const expectedCounts: Record<string, { days: number; chapters: number }> = {
      'john-21': { days: 21, chapters: 21 },
      'proverbs-31': { days: 31, chapters: 31 },
      'pauline-30': { days: 30, chapters: 87 },
      'torah-50': { days: 50, chapters: 187 },
      'kingdom-history-60': { days: 60, chapters: 249 },
      'prophets-90': { days: 90, chapters: 250 },
    };

    for (const [planId, expected] of Object.entries(expectedCounts)) {
      const plan = READING_PLANS.find((p) => p.id === planId)!;
      expect(plan.days).toHaveLength(expected.days);
      const seen = new Set<string>();
      for (const day of plan.days) {
        for (const a of day.assignments) {
          for (const ch of a.chapters) {
            seen.add(`${a.bookId}:${ch}`);
          }
        }
      }
      expect(seen.size).toBe(expected.chapters);
    }
  });

  it('encodes, decodes, sanitizes, and materializes custom reading plans', () => {
    const sections = [
      { bookId: 'romans', startChapter: 1, endChapter: 8 },
      { bookId: 'psalms', startChapter: 23, endChapter: 23 },
      { bookId: 'philippians' },
    ];
    expect(computeSectionsChapterCount(sections)).toBe(13);

    const spec = encodeCustomPlanSections(sections);
    expect(spec).toBe('romans:1-8,psalms:23,philippians');
    expect(decodeCustomPlanSections(spec)).toEqual(sections);

    const sanitized = sanitizeCustomPlanDefinition({
      id: 'custom-grace-path',
      title: 'Grace & Joy',
      description: 'Romans 1-8, Psalm 23, and Philippians',
      sectionsSpec: spec,
      durationDays: 10,
      accentColor: 'var(--color-sage)',
      createdAt: '2026-11-13T10:00:00Z',
      updatedAt: '2026-11-13T10:00:00Z',
    });
    expect(sanitized).not.toBeNull();

    const plan = materializeCustomPlan(sanitized!);
    expect(plan.isCustom).toBe(true);
    expect(plan.durationDays).toBe(10);
    expect(plan.days).toHaveLength(10);
    expect(plan.days[0].title).toContain('Romans');
    expect(extractSectionsFromPlan(plan)).toEqual(sections);
  });

  it('filters Plan Finder results by book name, scope, length, pace, and sort', () => {
    const customDef: CustomPlanDefinition = {
      id: 'custom-ruth-4',
      title: 'Ruth Retreat',
      description: 'Four mornings in Bethlehem',
      sections: [{ bookId: 'ruth' }],
      durationDays: 4,
      accentColor: 'var(--color-lamp)',
      createdAt: '2026-11-13T10:00:00Z',
      updatedAt: '2026-11-13T10:00:00Z',
    };
    const customPlan = materializeCustomPlan(customDef);
    const catalog = [customPlan, ...READING_PLANS];

    // Book keyword match ("Isaiah") includes Voice of the Prophets + Whole Bible plans
    const isaiahMatches = filterReadingPlans(catalog, {
      ...DEFAULT_PLAN_FINDER_FILTERS,
      query: 'Isaiah',
    });
    expect(isaiahMatches.some((p) => p.id === 'prophets-90')).toBe(true);
    expect(isaiahMatches.some((p) => p.id === 'john-21')).toBe(false);

    // Gentle pace (~1 ch/day) matches John 21, Daily Proverbs, Ruth Retreat
    const gentlePlans = filterReadingPlans(catalog, {
      ...DEFAULT_PLAN_FINDER_FILTERS,
      pace: 'gentle',
      sortBy: 'shortest',
    });
    expect(gentlePlans[0].id).toBe('custom-ruth-4');
    expect(gentlePlans.some((p) => p.id === 'john-21')).toBe(true);
    expect(gentlePlans.some((p) => p.id === 'proverbs-31')).toBe(true);

    // Custom category shows only user-created plans
    const customOnly = filterReadingPlans(catalog, {
      ...DEFAULT_PLAN_FINDER_FILTERS,
      category: 'custom',
    });
    expect(customOnly.map((p) => p.id)).toEqual(['custom-ruth-4']);

    // Legacy shelf without explicit shelfPlanIds includes active custom plan + 4 starter defaults
    const legacyShelf = getShelfPlans(catalog, 'custom-ruth-4');
    expect(legacyShelf[0].id).toBe('custom-ruth-4');
    expect(legacyShelf.length).toBe(5);

    // Explicit default shelf starts with strictly the 4 starter plans
    const starterShelf = getShelfPlans(catalog, 'gospels-acts-45', [...CORE_DEFAULT_PLAN_IDS]);
    expect(starterShelf.map((p) => p.id)).toEqual([
      'gospels-acts-45',
      'psalms-proverbs-31',
      'nt-90',
      'canonical-365',
    ]);

    // Explicit shelf preserves removal (including emptying to 0 plans) and ignores unknown IDs
    const trimmedShelf = getShelfPlans(catalog, 'nt-90', ['nt-90', 'unknown-id', 'custom-ruth-4']);
    expect(trimmedShelf.map((p) => p.id)).toEqual(['nt-90', 'custom-ruth-4']);
    expect(getShelfPlans(catalog, null, [])).toEqual([]);

    expect(sanitizeShelfPlanIds(undefined)).toEqual([...CORE_DEFAULT_PLAN_IDS]);
    expect(sanitizeShelfPlanIds([])).toEqual([]);
    expect(sanitizeShelfPlanIds(['john-21', 'john-21', 'Bad ID!', 'proverbs-31'])).toEqual([
      'john-21',
      'proverbs-31',
    ]);
  });
});
