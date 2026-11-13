import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Check, CheckCircle2, Copy, Edit3, Trash2 } from 'lucide-react';
import { addDays, formatPlainDate, todayPlainDate } from '../../lib/dates';
import { SPRING_PROGRESS, SPRING_SEAL, SPRING_TACTILE, TACTILE_TAP } from '../../lib/motion';
import type { PlanCoverageMeta, PlanDayStatus, PlanProgressState } from '../../lib/plans';
import type { ReadingPlan } from '../../types/bible';

interface ActivePlanFocusCardProps {
  plan: ReadingPlan;
  progress: PlanProgressState;
  coverage: PlanCoverageMeta;
  onOpenBook: (bookId: string) => void;
  onLogDay: (dayNumber: number, options: { readDate: string; note?: string }) => Promise<void>;
  onCustomizeCopy?: (plan: ReadingPlan) => void;
  onEditCustomPlan?: (plan: ReadingPlan) => void;
  onDeleteCustomPlan?: (planId: string) => Promise<void>;
}

export const ActivePlanFocusCard: React.FC<ActivePlanFocusCardProps> = ({
  plan,
  progress,
  coverage,
  onOpenBook,
  onLogDay,
  onCustomizeCopy,
  onEditCustomPlan,
  onDeleteCustomPlan,
}) => {
  const todayIso = todayPlainDate();
  const [readDate, setReadDate] = useState(todayIso);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [justLoggedDay, setJustLoggedDay] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const nextDayStatus: PlanDayStatus | null =
    progress.nextPendingIndex >= 0 ? progress.dayStatuses[progress.nextPendingIndex] : null;

  useEffect(() => {
    setNote('');
  }, [plan.id, nextDayStatus?.day.day]);

  useEffect(() => {
    setConfirmDelete(false);
  }, [plan.id]);

  const remainingDays = Math.max(0, plan.durationDays - progress.completedDaysCount);
  const projectedDate =
    remainingDays > 0 ? addDays(todayIso, Math.max(0, remainingDays - 1)) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextDayStatus || submitting) return;
    setSubmitting(true);
    const loggedDayNumber = nextDayStatus.day.day;
    try {
      await onLogDay(loggedDayNumber, {
        readDate: readDate || todayIso,
        note: note.trim() || undefined,
      });
      setNote('');
      setJustLoggedDay(loggedDayNumber);
      setTimeout(() => {
        setJustLoggedDay((prev) => (prev === loggedDayNumber ? null : prev));
      }, 2400);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      aria-labelledby="active-plan-heading"
      className="folio-sheet relative overflow-hidden p-4 sm:p-7"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: plan.accentColor }}
      />

      {/* Plan Summary Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--border-subtle)] pb-5 pl-2 lg:flex-row lg:items-end">
        <div className="max-w-[62ch]">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2
              id="active-plan-heading"
              className="font-display text-2xl font-medium tracking-tight text-[var(--text-primary)] sm:text-[1.85rem]"
            >
              {plan.title}
            </h2>
            {plan.isCustom && (
              <span className="rounded bg-[var(--color-lamp-soft)] px-2 py-0.5 text-xs font-medium text-[var(--color-lamp)]">
                Custom plan
              </span>
            )}
            <span className="text-xs font-medium text-[var(--text-secondary)] tabular-nums">
              {coverage.bookCount} {coverage.bookCount === 1 ? 'book' : 'books'}, ~
              {coverage.avgChaptersPerDay} ch/day
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
            {plan.description}
          </p>

          {(onCustomizeCopy || (plan.isCustom && (onEditCustomPlan || onDeleteCustomPlan))) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {plan.isCustom && onEditCustomPlan && (
                <button
                  type="button"
                  onClick={() => onEditCustomPlan(plan)}
                  className="tactile-press inline-flex min-h-8 items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                >
                  <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Edit plan</span>
                </button>
              )}
              {onCustomizeCopy && (
                <button
                  type="button"
                  onClick={() => onCustomizeCopy(plan)}
                  className="tactile-press inline-flex min-h-8 items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{plan.isCustom ? 'Duplicate' : 'Customize copy'}</span>
                </button>
              )}
              {plan.isCustom && onDeleteCustomPlan && !confirmDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="tactile-press inline-flex min-h-8 items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--color-crimson)]/45 hover:text-[var(--color-crimson)]"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Delete</span>
                </button>
              )}
              {plan.isCustom && onDeleteCustomPlan && confirmDelete && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void onDeleteCustomPlan(plan.id)}
                    className="btn-danger tactile-press inline-flex min-h-8 items-center rounded-md px-2.5 py-1 text-xs font-medium"
                  >
                    Confirm delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="tactile-press inline-flex min-h-8 items-center rounded-md border border-[var(--border-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] lg:shrink-0">
          <div className="px-3 py-2 text-center sm:px-4">
            <p className="text-[0.7rem] text-[var(--text-secondary)] sm:text-xs">Days synced</p>
            <p className="mt-0.5 font-display text-base font-medium tabular-nums text-[var(--text-primary)]">
              {progress.completedDaysCount}/{plan.durationDays}
            </p>
          </div>
          <div className="px-3 py-2 text-center sm:px-4">
            <p className="text-[0.7rem] text-[var(--text-secondary)] sm:text-xs">Chapters</p>
            <p className="mt-0.5 font-display text-base font-medium tabular-nums text-[var(--text-primary)]">
              {progress.readChaptersCount}/{progress.totalChaptersCount}
            </p>
          </div>
          <div className="px-3 py-2 text-center sm:px-4">
            <p className="text-[0.7rem] text-[var(--text-secondary)] sm:text-xs">
              {projectedDate ? '1/day finish' : 'Status'}
            </p>
            <p className="mt-0.5 font-display text-base font-medium tabular-nums text-[var(--text-primary)]">
              {projectedDate
                ? formatPlainDate(projectedDate, { month: 'short', day: 'numeric' })
                : 'Complete'}
            </p>
          </div>
        </div>
      </div>

      {/* Overall Plan Progress Bar */}
      <div className="mt-4 pl-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
          <motion.div
            className="h-full rounded-full"
            initial={false}
            animate={{ width: `${progress.percentage}%` }}
            transition={SPRING_PROGRESS}
            style={{
              backgroundColor:
                progress.completedDaysCount >= plan.durationDays
                  ? 'var(--color-sage)'
                  : plan.accentColor,
            }}
          />
        </div>
      </div>

      {/* Up Next Focus Folio */}
      <div className="mt-5 pl-2">
        {nextDayStatus ? (
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--color-accent)]">
                  Up next: Day {nextDayStatus.day.day} of {plan.durationDays}
                </span>
                {nextDayStatus.partial ? (
                  <span className="rounded bg-[var(--color-lamp-soft)] px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--color-lamp)]">
                    {nextDayStatus.readChaptersCount} of {nextDayStatus.totalChaptersCount}{' '}
                    chapters read
                  </span>
                ) : null}
              </div>

              <AnimatePresence>
                {justLoggedDay !== null ? (
                  <motion.span
                    key={justLoggedDay}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={SPRING_SEAL}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-sage)]"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    Day {justLoggedDay} inscribed
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>

            <h3 className="mt-2 font-display text-xl font-medium text-[var(--text-primary)] sm:text-2xl">
              {nextDayStatus.day.title}
            </h3>

            {/* Interactive Passage Chips */}
            <div className="mt-3 flex flex-wrap gap-2">
              {nextDayStatus.assignmentStatuses.map((assignment) => (
                <button
                  key={`${nextDayStatus.day.day}-${assignment.bookId}`}
                  type="button"
                  onClick={() => onOpenBook(assignment.bookId)}
                  className={`tactile-press inline-flex min-h-9 items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    assignment.done
                      ? 'border-[var(--color-sage)]/45 bg-[var(--color-sage-soft)] text-[var(--color-sage)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: assignment.divisionColorVar }}
                  />
                  <span>{assignment.chapterRangeLabel}</span>
                  {assignment.done ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[var(--text-secondary)] tabular-nums">
                      <BookOpen className="h-3 w-3" aria-hidden="true" />
                      {assignment.readChaptersCount}/{assignment.totalChaptersCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Optional Date + Reflection Input + Primary Action */}
            <div className="mt-4 grid gap-2.5 sm:grid-cols-12 sm:items-end">
              <div className="sm:col-span-3">
                <label
                  htmlFor="active-plan-date"
                  className="block text-xs font-medium text-[var(--text-secondary)]"
                >
                  Date read
                </label>
                <input
                  id="active-plan-date"
                  type="date"
                  value={readDate}
                  max={todayIso}
                  onChange={(e) => setReadDate(e.target.value)}
                  className="folio-input mt-1 min-h-10 w-full px-2.5 py-1.5 text-base sm:text-sm"
                />
              </div>

              <div className="sm:col-span-6">
                <label
                  htmlFor="active-plan-note"
                  className="block text-xs font-medium text-[var(--text-secondary)]"
                >
                  Reflection note (optional)
                </label>
                <input
                  id="active-plan-note"
                  type="text"
                  maxLength={2000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={`Note a takeaway from Day ${nextDayStatus.day.day}…`}
                  className="folio-input mt-1 min-h-10 w-full px-3 py-1.5 text-base placeholder:text-[var(--text-secondary)] sm:text-sm"
                />
              </div>

              <div className="sm:col-span-3">
                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileTap={TACTILE_TAP}
                  transition={SPRING_TACTILE}
                  className="btn-primary inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {nextDayStatus.partial
                      ? `Finish Day ${nextDayStatus.day.day}`
                      : `Log Day ${nextDayStatus.day.day}`}
                  </span>
                </motion.button>
              </div>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-sage)]/40 bg-[var(--color-sage-soft)]/50 p-4 sm:p-5">
            <div className="flex items-center gap-2.5 text-[var(--color-sage)]">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-display text-lg font-medium text-[var(--text-primary)]">
                  All {plan.durationDays} days completed
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Every chapter in {plan.title} is marked read in your ledger.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
