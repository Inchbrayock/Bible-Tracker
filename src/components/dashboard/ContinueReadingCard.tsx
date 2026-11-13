import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, CheckCircle2, Compass } from 'lucide-react';
import { BIBLE_BOOKS, DIVISION_META_BY_ID } from '../../data/bibleCanon';
import { todayPlainDate } from '../../lib/dates';
import { SPRING_PROGRESS, SPRING_SEAL, SPRING_TACTILE, TACTILE_TAP } from '../../lib/motion';
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
  const { summary, preferences, customReadingPlans, logChapters } = useBibleStore();
  const [justLoggedPlanDay, setJustLoggedPlanDay] = useState<number | null>(null);

  const inProgressBooks = useMemo(
    () =>
      BIBLE_BOOKS.map((b) => summary.bookProgressById[b.id])
        .filter((bp) => bp && bp.readChapters > 0 && !bp.completed)
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 4),
    [summary.bookProgressById]
  );

  const hasShelfPlans =
    !Array.isArray(preferences.shelfPlanIds) || preferences.shelfPlanIds.length > 0;

  const activePlan = useMemo(
    () =>
      hasShelfPlans && preferences.activePlanId
        ? getActiveReadingPlan(preferences.activePlanId, customReadingPlans)
        : null,
    [customReadingPlans, hasShelfPlans, preferences.activePlanId]
  );

  const planProgress = useMemo(
    () => (activePlan ? computePlanProgress(activePlan, summary) : null),
    [activePlan, summary]
  );

  const handleLogNextPlanDay = async () => {
    if (!activePlan || !planProgress) return;
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
            className="tactile-press inline-flex min-h-9 items-center text-xs font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
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
                  <motion.button
                    type="button"
                    whileTap={TACTILE_TAP}
                    transition={SPRING_TACTILE}
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
                          <motion.div
                            className="h-full rounded-full"
                            initial={false}
                            animate={{ width: `${bp.percentage}%` }}
                            transition={SPRING_PROGRESS}
                            style={{
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
                  </motion.button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Active Reading Plan Spotlight */}
      <div className="mt-5 border-t border-[var(--border-subtle)] pt-5">
        {!activePlan || !planProgress ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" aria-hidden="true" />
              <p className="text-sm text-[var(--text-secondary)]">
                No active reading plan on your shelf.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenPlans}
              className="tactile-press inline-flex min-h-8 items-center text-xs font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
            >
              Choose a plan
            </button>
          </div>
        ) : (
          <>
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
                  className="tactile-press inline-flex min-h-8 items-center text-xs font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
                >
                  All plans
                </button>
              </div>
            </div>

            <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
              <motion.div
                className="h-full rounded-full"
                initial={false}
                animate={{ width: `${planProgress.percentage}%` }}
                transition={SPRING_PROGRESS}
                style={{
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
                <div className="relative w-full shrink-0 sm:w-auto">
                  <AnimatePresence>
                    {justLoggedPlanDay !== null ? (
                      <motion.span
                        key={justLoggedPlanDay}
                        aria-hidden="true"
                        initial={{ opacity: 0, y: 4, scale: 0.86 }}
                        animate={{ opacity: 1, y: -22, scale: 1 }}
                        exit={{ opacity: 0, y: -32, scale: 0.94 }}
                        transition={SPRING_SEAL}
                        className="pointer-events-none absolute right-2 top-0 z-10 inline-flex items-center gap-1 rounded-full border border-[var(--color-sage)] bg-[var(--color-sage-soft)] px-2.5 py-0.5 text-[0.7rem] font-semibold text-[var(--color-sage)] shadow-xs"
                      >
                        <Check className="h-3 w-3" aria-hidden="true" />
                        Day {justLoggedPlanDay} logged
                      </motion.span>
                    ) : null}
                  </AnimatePresence>

                  <motion.button
                    type="button"
                    whileTap={TACTILE_TAP}
                    transition={SPRING_TACTILE}
                    onClick={() => void handleLogNextPlanDay()}
                    className="btn-primary inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-medium transition-opacity hover:opacity-90 sm:min-h-9 sm:w-auto sm:py-1.5"
                  >
                    <span>Log Day {planProgress.nextDay.day}</span>
                  </motion.button>
                </div>
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
                  className="tactile-press text-xs font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
                >
                  Choose another plan
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};
