import { BOOKS_BY_ID, DIVISION_META_BY_ID } from '../data/bibleCanon';
import { CORE_DEFAULT_PLAN_IDS, READING_PLANS } from '../data/readingPlans';
import type {
  BibleProgressSummary,
  ReadingLogEntry,
  ReadingPlan,
  ReadingPlanCategory,
  ReadingPlanDay,
  ReadingPlanOrder,
} from '../types/bible';
import { formatChapterRanges } from './progress';

export interface PlanAssignmentStatus {
  bookId: string;
  bookName: string;
  shortName: string;
  chapters: number[];
  chapterRangeLabel: string;
  readChaptersCount: number;
  totalChaptersCount: number;
  done: boolean;
  divisionColorVar: string;
}

export interface PlanDayStatus {
  day: ReadingPlanDay;
  done: boolean;
  partial: boolean;
  readChaptersCount: number;
  totalChaptersCount: number;
  assignmentStatuses: PlanAssignmentStatus[];
}

export interface PlanProgressState {
  dayStatuses: PlanDayStatus[];
  completedDaysCount: number;
  partialDaysCount: number;
  totalChaptersCount: number;
  readChaptersCount: number;
  nextPendingIndex: number;
  nextDay: ReadingPlanDay | null;
  percentage: number;
}

export interface PlanStage {
  id: string;
  index: number;
  label: string;
  shortLabel: string;
  startDay: number;
  endDay: number;
  days: PlanDayStatus[];
  completedCount: number;
  partialCount: number;
}

export interface PlanCoverageMeta {
  bookCount: number;
  totalChapters: number;
  avgChaptersPerDay: string;
}

const CALENDAR_MONTH_DAY_COUNTS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export type PlanLengthFilter = 'all' | 'short' | 'medium' | 'year';
export type PlanPaceFilter = 'all' | 'gentle' | 'steady' | 'deep';
export type PlanSortOption =
  | 'recommended'
  | 'shortest'
  | 'longest'
  | 'gentlest'
  | 'most-progress';

export interface PlanFinderFilterState {
  query: string;
  category: 'all' | ReadingPlanCategory;
  length: PlanLengthFilter;
  pace: PlanPaceFilter;
  sortBy: PlanSortOption;
}

export const DEFAULT_PLAN_FINDER_FILTERS: PlanFinderFilterState = {
  query: '',
  category: 'all',
  length: 'all',
  pace: 'all',
  sortBy: 'recommended',
};

/** Combines built-in curated plans with user-created custom reading plans. */
export function getAllReadingPlans(customPlans: ReadingPlan[] = []): ReadingPlan[] {
  return [...customPlans, ...READING_PLANS];
}

/** Resolves the user's active reading plan across built-in and custom plans, falling back to the default plan. */
export function getActiveReadingPlan(
  activePlanId: string | null | undefined,
  customPlans: ReadingPlan[] = []
): ReadingPlan {
  const all = getAllReadingPlans(customPlans);
  return all.find((p) => p.id === activePlanId) ?? READING_PLANS[0];
}

/** Resolves a reading plan by exact id across built-in and custom plans, returning null if not found. */
export function getReadingPlanById(
  planId: string | null | undefined,
  customPlans: ReadingPlan[] = []
): ReadingPlan | null {
  if (!planId) return null;
  return getAllReadingPlans(customPlans).find((p) => p.id === planId) ?? null;
}

export function getPlanCategoryLabel(category: ReadingPlanCategory | undefined): string {
  switch (category) {
    case 'whole-bible':
      return 'Whole Bible';
    case 'old-testament':
      return 'Old Testament';
    case 'new-testament':
      return 'New Testament';
    case 'gospels':
      return 'Gospels';
    case 'wisdom':
      return 'Wisdom & Psalms';
    case 'prophets':
      return 'Prophets';
    case 'epistles':
      return 'Epistles';
    case 'custom':
      return 'Custom';
    default:
      return 'Guided';
  }
}

export function getPlanOrderLabel(order: ReadingPlanOrder | undefined): string {
  switch (order) {
    case 'canonical':
      return 'Canonical order';
    case 'chronological':
      return 'Chronological order';
    case 'paired':
      return 'Paired daily';
    case 'thematic':
      return 'Thematic';
    case 'custom':
      return 'Custom sequence';
    default:
      return 'Sequential';
  }
}

/** Computes per-day, per-assignment, and overall progress for a reading plan from chapter logs. */
export function computePlanProgress(
  plan: ReadingPlan,
  summary: BibleProgressSummary
): PlanProgressState {
  let totalChaptersCount = 0;
  let readChaptersCount = 0;
  let partialDaysCount = 0;

  const dayStatuses: PlanDayStatus[] = plan.days.map((day) => {
    let dayTotal = 0;
    let dayRead = 0;

    const assignmentStatuses: PlanAssignmentStatus[] = day.assignments.map((a) => {
      const book = BOOKS_BY_ID[a.bookId];
      const bp = summary.bookProgressById[a.bookId];
      const chCount = a.chapters.length;
      const readInAssignment = a.chapters.filter((ch) => Boolean(bp?.chapterMap[ch])).length;
      const assignmentDone = chCount > 0 && readInAssignment === chCount;

      dayTotal += chCount;
      dayRead += readInAssignment;

      const rangeText = formatChapterRanges(a.chapters);
      return {
        bookId: a.bookId,
        bookName: book?.name ?? a.bookId,
        shortName: book?.shortName ?? a.bookId,
        chapters: a.chapters,
        chapterRangeLabel: `${book?.name ?? a.bookId} ${rangeText}`.trim(),
        readChaptersCount: readInAssignment,
        totalChaptersCount: chCount,
        done: assignmentDone,
        divisionColorVar: book ? DIVISION_META_BY_ID[book.division].colorVar : plan.accentColor,
      };
    });

    totalChaptersCount += dayTotal;
    readChaptersCount += dayRead;

    const done = dayTotal > 0 && dayRead === dayTotal;
    const partial = dayRead > 0 && dayRead < dayTotal;
    if (partial) {
      partialDaysCount += 1;
    }

    return {
      day,
      done,
      partial,
      readChaptersCount: dayRead,
      totalChaptersCount: dayTotal,
      assignmentStatuses,
    };
  });

  const completedDaysCount = dayStatuses.filter((d) => d.done).length;
  const nextPendingIndex = dayStatuses.findIndex((d) => !d.done);
  const nextDay = nextPendingIndex === -1 ? null : dayStatuses[nextPendingIndex].day;
  const percentage =
    plan.durationDays > 0 ? Math.round((completedDaysCount / plan.durationDays) * 100) : 0;

  return {
    dayStatuses,
    completedDaysCount,
    partialDaysCount,
    totalChaptersCount,
    readChaptersCount,
    nextPendingIndex,
    nextDay,
    percentage,
  };
}

/** Returns only the unread chapters needed to mark a reading plan day complete. */
export function getUnreadAssignmentsForDay(
  day: ReadingPlanDay,
  summary: BibleProgressSummary
): { bookId: string; chapters: number[] }[] {
  const pending: { bookId: string; chapters: number[] }[] = [];
  for (const assignment of day.assignments) {
    const bp = summary.bookProgressById[assignment.bookId];
    const unread = assignment.chapters.filter((ch) => !bp?.chapterMap[ch]);
    if (unread.length > 0) {
      pending.push({ bookId: assignment.bookId, chapters: unread });
    }
  }
  return pending;
}

/** Derives canonical book count, total chapters, and daily chapter average for a plan. */
export function getPlanCoverageMeta(plan: ReadingPlan): PlanCoverageMeta {
  const books = new Set<string>();
  let totalChapters = 0;
  for (const day of plan.days) {
    for (const assignment of day.assignments) {
      books.add(assignment.bookId);
      totalChapters += assignment.chapters.length;
    }
  }
  const avg = plan.durationDays > 0 ? (totalChapters / plan.durationDays).toFixed(1) : '0';
  return {
    bookCount: books.size,
    totalChapters,
    avgChaptersPerDay: avg.endsWith('.0') ? avg.slice(0, -2) : avg,
  };
}

/**
 * Groups plan days into scannable stages:
 * - <= 45 days: 7-day weeks
 * - 46..120 days: 15-day stages
 * - > 120 days (e.g. 365-day plan): 12 month-proportioned stages
 */
export function buildPlanStages(plan: ReadingPlan, dayStatuses: PlanDayStatus[]): PlanStage[] {
  if (dayStatuses.length === 0) return [];

  const slices: { label: string; shortLabel: string; days: PlanDayStatus[] }[] = [];

  if (plan.durationDays <= 45) {
    for (let i = 0; i < dayStatuses.length; i += 7) {
      const chunk = dayStatuses.slice(i, i + 7);
      const weekNum = Math.floor(i / 7) + 1;
      slices.push({
        label: `Week ${weekNum}`,
        shortLabel: `Wk ${weekNum}`,
        days: chunk,
      });
    }
  } else if (plan.durationDays <= 120) {
    const chunkSize = 15;
    for (let i = 0; i < dayStatuses.length; i += chunkSize) {
      const chunk = dayStatuses.slice(i, i + chunkSize);
      const stageNum = Math.floor(i / chunkSize) + 1;
      const start = chunk[0].day.day;
      const end = chunk[chunk.length - 1].day.day;
      slices.push({
        label: `Days ${start}–${end}`,
        shortLabel: `Part ${stageNum}`,
        days: chunk,
      });
    }
  } else {
    let cursor = 0;
    let monthIndex = 0;
    while (cursor < dayStatuses.length) {
      const len =
        monthIndex < CALENDAR_MONTH_DAY_COUNTS.length
          ? CALENDAR_MONTH_DAY_COUNTS[monthIndex]
          : 30;
      const chunk = dayStatuses.slice(cursor, cursor + len);
      cursor += chunk.length;
      monthIndex += 1;
      slices.push({
        label: `Month ${monthIndex}`,
        shortLabel: `M${monthIndex}`,
        days: chunk,
      });
    }
  }

  return slices.map((slice, idx) => ({
    id: `stage-${idx + 1}`,
    index: idx,
    label: slice.label,
    shortLabel: slice.shortLabel,
    startDay: slice.days[0].day.day,
    endDay: slice.days[slice.days.length - 1].day.day,
    days: slice.days,
    completedCount: slice.days.filter((d) => d.done).length,
    partialCount: slice.days.filter((d) => d.partial).length,
  }));
}

/**
 * Matches reading log entries containing reflection notes to the plan days whose passages they overlap.
 * Prioritizes entries explicitly logged under `plan.id`, then chronological newest first.
 */
export function matchPlanDayNotes(
  plan: ReadingPlan,
  logs: ReadingLogEntry[]
): Record<number, ReadingLogEntry[]> {
  const notedLogs = logs.filter((l) => Boolean(l.note && l.note.trim().length > 0));
  if (notedLogs.length === 0) return {};

  // Index logs by bookId for fast lookup across 365-day plans
  const logsByBook = new Map<string, { log: ReadingLogEntry; chapterSet: Set<number> }[]>();
  for (const log of notedLogs) {
    const list = logsByBook.get(log.bookId) ?? [];
    list.push({ log, chapterSet: new Set(log.chapters) });
    logsByBook.set(log.bookId, list);
  }

  const result: Record<number, ReadingLogEntry[]> = {};

  for (const day of plan.days) {
    const matchedIds = new Set<string>();
    const matches: ReadingLogEntry[] = [];

    for (const assignment of day.assignments) {
      const candidates = logsByBook.get(assignment.bookId);
      if (!candidates) continue;

      for (const candidate of candidates) {
        if (matchedIds.has(candidate.log.id)) continue;
        const overlaps = assignment.chapters.some((ch) => candidate.chapterSet.has(ch));
        if (overlaps) {
          matchedIds.add(candidate.log.id);
          matches.push(candidate.log);
        }
      }
    }

    if (matches.length > 0) {
      matches.sort((a, b) => {
        const aPlan = a.planId === plan.id ? 1 : 0;
        const bPlan = b.planId === plan.id ? 1 : 0;
        if (aPlan !== bPlan) return bPlan - aPlan;
        return b.readDate.localeCompare(a.readDate) || b.loggedAt.localeCompare(a.loggedAt);
      });
      result[day.day] = matches;
    }
  }

  return result;
}

/** Returns numeric average chapters per day for a reading plan. */
export function getPlanNumericPace(plan: ReadingPlan): number {
  if (plan.durationDays <= 0) return 0;
  let totalChapters = 0;
  for (const day of plan.days) {
    for (const assignment of day.assignments) {
      totalChapters += assignment.chapters.length;
    }
  }
  return totalChapters / plan.durationDays;
}

/** Lists distinct canonical book names covered by a reading plan in appearance order. */
export function getPlanBookNames(plan: ReadingPlan): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const day of plan.days) {
    for (const assignment of day.assignments) {
      if (seen.has(assignment.bookId)) continue;
      seen.add(assignment.bookId);
      const book = BOOKS_BY_ID[assignment.bookId];
      if (book) names.push(book.name);
    }
  }
  return names;
}

/** Filters and sorts reading plans for the Plan Finder by keyword/book, scope, length, and daily pace. */
export function filterReadingPlans(
  plans: ReadingPlan[],
  filter: PlanFinderFilterState,
  progressByPlanId: Record<string, PlanProgressState> = {}
): ReadingPlan[] {
  const q = filter.query.trim().toLowerCase();

  const filtered = plans.filter((plan) => {
    if (filter.category !== 'all') {
      const cat = plan.isCustom ? 'custom' : plan.category;
      if (cat !== filter.category) return false;
    }

    if (filter.length === 'short' && plan.durationDays > 35) return false;
    if (filter.length === 'medium' && (plan.durationDays <= 35 || plan.durationDays > 120)) {
      return false;
    }
    if (filter.length === 'year' && plan.durationDays <= 120) return false;

    const pace = getPlanNumericPace(plan);
    if (filter.pace === 'gentle' && pace > 1.8) return false;
    if (filter.pace === 'steady' && (pace <= 1.8 || pace > 3.6)) return false;
    if (filter.pace === 'deep' && pace <= 3.6) return false;

    if (q.length > 0) {
      const bookNames = getPlanBookNames(plan).join(' ').toLowerCase();
      const haystack = `${plan.title} ${plan.subtitle} ${plan.description} ${getPlanCategoryLabel(
        plan.category
      )} ${getPlanOrderLabel(plan.order)} ${bookNames}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });

  if (filter.sortBy === 'recommended') {
    return filtered;
  }

  return [...filtered].sort((a, b) => {
    if (filter.sortBy === 'shortest') {
      return a.durationDays - b.durationDays || a.title.localeCompare(b.title);
    }
    if (filter.sortBy === 'longest') {
      return b.durationDays - a.durationDays || a.title.localeCompare(b.title);
    }
    if (filter.sortBy === 'gentlest') {
      return getPlanNumericPace(a) - getPlanNumericPace(b) || a.durationDays - b.durationDays;
    }
    const pctA = progressByPlanId[a.id]?.percentage ?? 0;
    const pctB = progressByPlanId[b.id]?.percentage ?? 0;
    return pctB - pctA || a.durationDays - b.durationDays;
  });
}

/** Sanitizes a persisted list of plan IDs for the Plans shelf while distinguishing an explicit empty list from an unset legacy preference. */
export function sanitizeShelfPlanIds(
  rawIds: unknown,
  fallbackIds: readonly string[] = CORE_DEFAULT_PLAN_IDS
): string[] {
  const source = Array.isArray(rawIds) ? rawIds : fallbackIds;
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const item of source) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed || trimmed.length > 64 || !/^[a-z0-9-]+$/.test(trimmed)) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    clean.push(trimmed);
    if (clean.length >= 100) break;
  }
  return clean;
}

/**
 * Selects the plans displayed on the user's quick-switch shelf.
 * When `shelfPlanIds` is omitted (legacy callers), returns the 4 starter plans
 * plus `activePlanId` if outside the core set.
 * When `shelfPlanIds` is an explicit list (including empty `[]`), returns only
 * the matching plans in the user's shelf order.
 */
export function getShelfPlans(
  allPlans: ReadingPlan[],
  activePlanId: string | null | undefined,
  shelfPlanIds?: string[] | null
): ReadingPlan[] {
  const byId = new Map(allPlans.map((p) => [p.id, p]));
  const picked = new Map<string, ReadingPlan>();

  if (Array.isArray(shelfPlanIds)) {
    for (const id of shelfPlanIds) {
      const plan = byId.get(id);
      if (plan) picked.set(plan.id, plan);
    }
    return [...picked.values()];
  }

  const active = activePlanId ? byId.get(activePlanId) : undefined;
  if (active && !CORE_DEFAULT_PLAN_IDS.includes(active.id as (typeof CORE_DEFAULT_PLAN_IDS)[number])) {
    picked.set(active.id, active);
  }

  for (const coreId of CORE_DEFAULT_PLAN_IDS) {
    const core = byId.get(coreId);
    if (core) picked.set(core.id, core);
  }

  return [...picked.values()];
}
