import { READING_PLANS } from '../data/readingPlans';
import type { BibleProgressSummary, ReadingPlan, ReadingPlanDay } from '../types/bible';

export interface PlanDayStatus {
  day: ReadingPlanDay;
  done: boolean;
}

export interface PlanProgressState {
  dayStatuses: PlanDayStatus[];
  completedDaysCount: number;
  nextPendingIndex: number;
  nextDay: ReadingPlanDay | null;
  percentage: number;
}

/** Resolves the user's active reading plan, falling back to the default plan. */
export function getActiveReadingPlan(activePlanId: string | null | undefined): ReadingPlan {
  return READING_PLANS.find((p) => p.id === activePlanId) ?? READING_PLANS[0];
}

/** Computes per-day completion and overall progress for a reading plan from chapter logs. */
export function computePlanProgress(
  plan: ReadingPlan,
  summary: BibleProgressSummary
): PlanProgressState {
  const dayStatuses = plan.days.map((day) => {
    const done = day.assignments.every((a) => {
      const bp = summary.bookProgressById[a.bookId];
      return a.chapters.every((ch) => Boolean(bp?.chapterMap[ch]));
    });
    return { day, done };
  });

  const completedDaysCount = dayStatuses.filter((d) => d.done).length;
  const nextPendingIndex = dayStatuses.findIndex((d) => !d.done);
  const nextDay = nextPendingIndex === -1 ? null : dayStatuses[nextPendingIndex].day;
  const percentage =
    plan.durationDays > 0 ? Math.round((completedDaysCount / plan.durationDays) * 100) : 0;

  return {
    dayStatuses,
    completedDaysCount,
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
