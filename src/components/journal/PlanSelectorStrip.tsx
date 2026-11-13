import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Compass, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { SPRING_PROGRESS, SPRING_TACTILE, TACTILE_PILL_TAP, TACTILE_TAP } from '../../lib/motion';
import type { PlanProgressState } from '../../lib/plans';
import type { ReadingPlan } from '../../types/bible';
import { InlineDeleteConfirm } from '../ui/InlineDeleteConfirm';

export interface RemovedShelfNotice {
  planId: string;
  title: string;
}

interface PlanSelectorStripProps {
  plans: ReadingPlan[];
  totalCatalogCount: number;
  activePlanId: string | null;
  progressByPlanId: Record<string, PlanProgressState>;
  recentlyRemoved?: RemovedShelfNotice | null;
  onUndoRemove?: () => void;
  onDismissRemovedNotice?: () => void;
  onSelectPlan: (planId: string) => void;
  onRemoveFromShelf: (planId: string) => void;
  onDeleteCustomPlan: (planId: string) => Promise<void>;
  onRestoreStarterPlans: () => void;
  onOpenFinder: () => void;
  onCreateCustomPlan: () => void;
}

export const PlanSelectorStrip: React.FC<PlanSelectorStripProps> = ({
  plans,
  totalCatalogCount,
  activePlanId,
  progressByPlanId,
  recentlyRemoved,
  onUndoRemove,
  onDismissRemovedNotice,
  onSelectPlan,
  onRemoveFromShelf,
  onDeleteCustomPlan,
  onRestoreStarterPlans,
  onOpenFinder,
  onCreateCustomPlan,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {/* Shelf Header & Actions */}
      <div className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Your plans shelf
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            {plans.length === 0
              ? 'Your shelf is empty. Pick a curated path or build a custom reading plan.'
              : `Switch between plans on your shelf, remove plans anytime, or explore all ${totalCatalogCount} in Plan Finder.`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:shrink-0 sm:flex-wrap sm:items-center sm:gap-2">
          <motion.button
            type="button"
            whileTap={TACTILE_TAP}
            transition={SPRING_TACTILE}
            onClick={onOpenFinder}
            className="tactile-press inline-flex min-h-10 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] sm:min-h-9 sm:w-auto sm:px-3"
          >
            <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Find a plan</span>
            <span className="rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[0.68rem] tabular-nums text-[var(--text-secondary)]">
              {totalCatalogCount}
            </span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={TACTILE_TAP}
            transition={SPRING_TACTILE}
            onClick={onCreateCustomPlan}
            className="btn-primary inline-flex min-h-10 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-90 sm:min-h-9 sm:w-auto sm:px-3"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Create custom plan</span>
          </motion.button>
        </div>
      </div>

      {/* Inline Undo Strip for Deleted Curated Shelf Plan */}
      {recentlyRemoved && onUndoRemove && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs"
        >
          <span className="text-[var(--text-secondary)]">
            Removed{' '}
            <span className="font-medium text-[var(--text-primary)]">
              {recentlyRemoved.title}
            </span>{' '}
            from your shelf.
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onUndoRemove}
              className="tactile-press font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
            >
              Undo
            </button>
            {onDismissRemovedNotice && (
              <button
                type="button"
                onClick={onDismissRemovedNotice}
                className="tactile-press text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick-Switch Shelf Cards */}
      {plans.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)]/55 px-5 py-7 text-center">
          <p className="font-display text-lg font-medium text-[var(--text-primary)]">
            No reading plans on your shelf
          </p>
          <p className="mx-auto mt-1 max-w-[46ch] text-xs leading-relaxed text-[var(--text-secondary)]">
            Choose from {totalCatalogCount} curated plans, create your own custom reading schedule, or bring back the 4 default starter plans.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={onOpenFinder}
              className="btn-primary tactile-press inline-flex min-h-9 items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Find a plan</span>
            </button>
            <button
              type="button"
              onClick={onCreateCustomPlan}
              className="tactile-press inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Create custom plan</span>
            </button>
            <button
              type="button"
              onClick={onRestoreStarterPlans}
              className="tactile-press inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Restore 4 starter plans</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          className="grid grid-cols-2 gap-2.5 lg:grid-cols-4"
          role="group"
          aria-label="Choose a reading plan"
        >
          {plans.map((plan) => {
            const isSelected = plan.id === activePlanId;
            const progress = progressByPlanId[plan.id];
            const completedDays = progress?.completedDaysCount ?? 0;
            const pct = progress?.percentage ?? 0;
            const isFinished = completedDays >= plan.durationDays;
            const confirmingDelete = confirmDeleteId === plan.id;
            const titleId = `shelf-plan-title-${plan.id}`;

            return (
              <article
                key={plan.id}
                aria-labelledby={titleId}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-[var(--color-accent)] bg-[var(--bg-elevated)] ring-1 ring-[var(--color-accent)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]/65 hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 w-1"
                  style={{ backgroundColor: plan.accentColor }}
                />

                {confirmingDelete ? (
                  <InlineDeleteConfirm
                    compactOnMobile
                    describedBy={titleId}
                    className="absolute right-2 top-2 z-10"
                    onCancel={() => setConfirmDeleteId(null)}
                    onConfirm={() => {
                      setConfirmDeleteId(null);
                      if (plan.isCustom) {
                        void onDeleteCustomPlan(plan.id);
                      } else {
                        onRemoveFromShelf(plan.id);
                      }
                    }}
                  />
                ) : (
                  <motion.button
                    type="button"
                    whileTap={TACTILE_PILL_TAP}
                    transition={SPRING_TACTILE}
                    onClick={() => setConfirmDeleteId(plan.id)}
                    aria-label={plan.isCustom ? 'Delete custom plan from shelf' : 'Delete plan from shelf'}
                    aria-describedby={titleId}
                    title={plan.isCustom ? 'Delete custom plan' : 'Delete from shelf'}
                    className="tactile-press absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] transition-colors hover:border-[var(--color-crimson)] hover:text-[var(--color-crimson)] focus-visible:border-[var(--color-crimson)] focus-visible:text-[var(--color-crimson)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </motion.button>
                )}

                <motion.button
                  type="button"
                  whileTap={TACTILE_TAP}
                  transition={SPRING_TACTILE}
                  onClick={() => {
                    setConfirmDeleteId(null);
                    onSelectPlan(plan.id);
                  }}
                  aria-pressed={isSelected}
                  className="flex h-full w-full flex-col justify-between p-3.5 text-left"
                >
                  <div className="w-full pl-2">
                    {confirmingDelete ? (
                      <div className="h-9" aria-hidden="true" />
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 pr-9 text-xs">
                        <span className="tabular-nums text-[var(--text-secondary)]">
                          {plan.durationDays} days
                        </span>
                        {plan.isCustom && (
                          <span className="rounded bg-[var(--color-lamp-soft)] px-1.5 py-0.5 text-[0.65rem] font-medium text-[var(--color-lamp)]">
                            Custom
                          </span>
                        )}
                        {isFinished ? (
                          <span className="inline-flex items-center gap-1 font-medium text-[var(--color-sage)]">
                            <Check className="h-3 w-3" aria-hidden="true" />
                            Done
                          </span>
                        ) : isSelected ? (
                          <span className="inline-flex items-center gap-1 font-medium text-[var(--color-accent)]">
                            <Compass className="h-3 w-3" aria-hidden="true" />
                            Active
                          </span>
                        ) : null}
                      </div>
                    )}

                    <span
                      id={titleId}
                      className="mt-1 block font-display text-base font-medium leading-snug text-[var(--text-primary)] sm:text-[1.05rem]"
                    >
                      {plan.title}
                    </span>
                  </div>

                  <div className="mt-3 w-full pl-2">
                    <div className="flex items-baseline justify-between gap-2 text-xs tabular-nums text-[var(--text-secondary)]">
                      <span>
                        {completedDays}/{plan.durationDays} days
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                      <motion.div
                        className="h-full rounded-full"
                        initial={false}
                        animate={{ width: `${pct}%` }}
                        transition={SPRING_PROGRESS}
                        style={{
                          backgroundColor: isFinished ? 'var(--color-sage)' : plan.accentColor,
                        }}
                      />
                    </div>
                  </div>
                </motion.button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
