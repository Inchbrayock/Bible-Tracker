import React, { useMemo, useState } from 'react';
import { Check, CheckCircle2, Compass } from 'lucide-react';
import { BIBLE_BOOKS, DIVISION_META_BY_ID } from '../../data/bibleCanon';
import { todayPlainDate } from '../../lib/dates';
import {
  computePlanProgress,
  getActiveReadingPlan,
  getUnreadAssignmentsForDay,
} from '../../lib/plans';
import { useBibleStore } from '../../store/useBibleStore';

interface ContinueReadingCardProps {
  onOpenBook: (bookId: string) => void;
  onBrowseLibrary: () => void;
  onOpenPlans: () => void;
}

export const ContinueReadingCard: React.FC<ContinueReadingCardProps> = ({
  onOpenBook,
  onBrowseLibrary,
  onOpenPlans,
}) => {
  const { summary, preferences, logChapters } = useBibleStore();
  const [justLoggedPlanDay, setJustLoggedPlanDay] = useState<number | null>(null);

  const inProgressBooks = useMemo(
    () =>
      BIBLE_BOOKS.map((b) => summary.bookProgressById[b.id])
        .filter((bp) => bp && bp.readChapters > 0 && !bp.completed)
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 4),
    [summary.bookProgressById]
  );

  const activePlan = useMemo(
    () => getActiveReadingPlan(preferences.activePlanId),
    [preferences.activePlanId]
  );

  const planProgress = useMemo(
    () => computePlanProgress(activePlan, summary),
    [activePlan, summary]
  );

  const handleLogNextPlanDay = async () => {
    const targetDay = planProgress.nextDay;
    if (!targetDay) return;
    const today = todayPlainDate();
    for (const assignment of getUnreadAssignmentsForDay(targetDay, summary)) {
      await logChapters({
        bookId: assignment.bookId,
        chapters: assignment.chapters,
        readDate: today,
        planId: activePlan.id,
      });
    }
    setJustLoggedPlanDay(targetDay.day);
    setTimeout(() => setJustLoggedPlanDay(null), 2400);
  };

  return (
    <section
      className="folio-sheet flex h-full flex-col justify-between p-4 sm:p-7"
      aria-labelledby="active-books-heading"
    >
      {/* In Progress Books */}
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <h2
            id="active-books-heading"
            className="font-display text-xl font-medium text-[var(--text-primary)] sm:text-2xl"
          >
            In Progress
          </h2>
          <button
            type="button"
            onClick={onBrowseLibrary}
            className="inline-flex min-h-9 items-center text-xs font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
          >
            Browse 66 books
          </button>
        </div>

        {inProgressBooks.length === 0 ? (
          <p className="mt-2.5 text-sm leading-relaxed text-[var(--text-secondary)]">
            No books mid-way right now. Open any book from the library or follow your reading plan below.
          </p>
        ) : (
          <ul
            className={`mt-3.5 grid gap-2.5 ${
              inProgressBooks.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {inProgressBooks.map((bp) => {
              const divMeta = DIVISION_META_BY_ID[bp.book.division];
              return (
                <li key={bp.book.id}>
                  <button
                    type="button"
                    onClick={() => onOpenBook(bp.book.id)}
                    className="flex w-full items-center gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]"
                  >
                    <span
                      className="h-8 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: divMeta.colorVar }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-display text-base font-medium text-[var(--text-primary)]">
                          {bp.book.name}
                        </span>
                        <span className="shrink-0 text-xs font-medium tabular-nums text-[var(--text-secondary)]">
                          {bp.readChapters}/{bp.totalChapters}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2.5">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                          <div
                            className="h-full rounded-full transition-[width] duration-300"
                            style={{
                              width: `${bp.percentage}%`,
                              backgroundColor: divMeta.colorVar,
                            }}
                          />
                        </div>
                        {bp.nextUnreadChapter !== null && (
                          <span className="shrink-0 text-[0.7rem] text-[var(--text-secondary)] tabular-nums">
                            Next: ch. {bp.nextUnreadChapter}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Active Reading Plan Spotlight */}
      <div className="mt-5 border-t border-[var(--border-subtle)] pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Compass className="h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
            <h3 className="truncate font-display text-lg font-medium text-[var(--text-primary)]">
              {activePlan.title}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-secondary)] tabular-nums">
              {planProgress.completedDaysCount} of {activePlan.durationDays} days
            </span>
            <button
              type="button"
              onClick={onOpenPlans}
              className="inline-flex min-h-8 items-center text-xs font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
            >
              All plans
            </button>
          </div>
        </div>

        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${planProgress.percentage}%`,
              backgroundColor: activePlan.accentColor,
            }}
          />
        </div>

        {planProgress.nextDay ? (
          <div className="mt-3.5 flex flex-col justify-between gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-3 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                Day {planProgress.nextDay.day} reading
              </p>
              <p className="font-display text-base font-medium leading-snug text-[var(--text-primary)]">
                {planProgress.nextDay.title}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleLogNextPlanDay()}
              className="btn-primary inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-medium transition-opacity hover:opacity-90 sm:min-h-9 sm:w-auto sm:py-1.5"
            >
              {justLoggedPlanDay === planProgress.nextDay.day ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Logged</span>
                </>
              ) : (
                <span>Log Day {planProgress.nextDay.day}</span>
              )}
            </button>
          </div>
        ) : (
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-sage)]">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              All {activePlan.durationDays} days completed
            </span>
            <button
              type="button"
              onClick={onOpenPlans}
              className="text-xs font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
            >
              Choose another plan
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
