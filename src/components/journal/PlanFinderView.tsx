import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  Copy,
  Edit3,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { SPRING_PROGRESS, SPRING_TACTILE, TACTILE_TAP } from '../../lib/motion';
import {
  DEFAULT_PLAN_FINDER_FILTERS,
  filterReadingPlans,
  getPlanBookNames,
  getPlanCategoryLabel,
  getPlanCoverageMeta,
  getPlanOrderLabel,
  type PlanFinderFilterState,
  type PlanLengthFilter,
  type PlanPaceFilter,
  type PlanProgressState,
  type PlanSortOption,
} from '../../lib/plans';
import type { ReadingPlan, ReadingPlanCategory } from '../../types/bible';

interface PlanFinderViewProps {
  plans: ReadingPlan[];
  activePlanId: string | null;
  shelfPlanIds?: string[];
  progressByPlanId: Record<string, PlanProgressState>;
  onSelectPlan: (planId: string) => void;
  onClose: () => void;
  onCreateCustomPlan: () => void;
  onEditCustomPlan: (plan: ReadingPlan) => void;
  onCustomizeCopy: (plan: ReadingPlan) => void;
  onDeleteCustomPlan: (planId: string) => Promise<void>;
}

const SCOPE_OPTIONS: { id: 'all' | ReadingPlanCategory; label: string }[] = [
  { id: 'all', label: 'All scopes' },
  { id: 'whole-bible', label: 'Whole Bible' },
  { id: 'old-testament', label: 'Old Testament' },
  { id: 'new-testament', label: 'New Testament' },
  { id: 'gospels', label: 'Gospels' },
  { id: 'wisdom', label: 'Wisdom & Psalms' },
  { id: 'prophets', label: 'Prophets' },
  { id: 'epistles', label: 'Epistles' },
  { id: 'custom', label: 'Custom' },
];

interface QuickGoalPreset {
  id: string;
  label: string;
  patch: Partial<PlanFinderFilterState>;
}

const QUICK_GOALS: QuickGoalPreset[] = [
  {
    id: 'gentle',
    label: '1 chapter daily',
    patch: { category: 'all', length: 'all', pace: 'gentle', query: '', sortBy: 'gentlest' },
  },
  {
    id: 'short-month',
    label: '1-month path',
    patch: { category: 'all', length: 'short', pace: 'all', query: '', sortBy: 'shortest' },
  },
  {
    id: 'gospels',
    label: 'Read the Gospels',
    patch: { category: 'gospels', length: 'all', pace: 'all', query: '', sortBy: 'recommended' },
  },
  {
    id: 'wisdom',
    label: 'Psalms & Proverbs',
    patch: { category: 'wisdom', length: 'all', pace: 'all', query: '', sortBy: 'recommended' },
  },
  {
    id: 'whole-year',
    label: 'Whole Bible in 1 Year',
    patch: { category: 'whole-bible', length: 'year', pace: 'all', query: '', sortBy: 'recommended' },
  },
];

export const PlanFinderView: React.FC<PlanFinderViewProps> = ({
  plans,
  activePlanId,
  shelfPlanIds,
  progressByPlanId,
  onSelectPlan,
  onClose,
  onCreateCustomPlan,
  onEditCustomPlan,
  onCustomizeCopy,
  onDeleteCustomPlan,
}) => {
  const [filters, setFilters] = useState<PlanFinderFilterState>(DEFAULT_PLAN_FINDER_FILTERS);
  const [previewPlanId, setPreviewPlanId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const shelfIdsSet = useMemo(
    () => (Array.isArray(shelfPlanIds) ? new Set(shelfPlanIds) : null),
    [shelfPlanIds]
  );

  const filteredPlans = useMemo(
    () => filterReadingPlans(plans, filters, progressByPlanId),
    [plans, filters, progressByPlanId]
  );

  const hasActiveFilters =
    filters.query.trim().length > 0 ||
    filters.category !== 'all' ||
    filters.length !== 'all' ||
    filters.pace !== 'all' ||
    filters.sortBy !== 'recommended';

  const customCount = useMemo(() => plans.filter((p) => p.isCustom).length, [plans]);

  const applyQuickGoal = (preset: QuickGoalPreset) => {
    setFilters((prev) => ({
      ...prev,
      ...preset.patch,
    }));
  };

  return (
    <section aria-labelledby="plan-finder-heading" className="space-y-5">
      {/* Finder Top Header */}
      <div className="folio-sheet p-4 sm:p-7">
        <div className="flex flex-col justify-between gap-4 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="tactile-press inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Back to active plan</span>
              </button>
              <h2
                id="plan-finder-heading"
                className="font-display text-2xl font-medium tracking-tight text-[var(--text-primary)] sm:text-[1.75rem]"
              >
                Plan Finder
              </h2>
            </div>
            <p className="mt-1.5 max-w-[66ch] text-sm text-[var(--text-secondary)]">
              Search {plans.length} curated and custom reading paths by Scripture focus, length,
              daily chapter pace, or any book you want to read next.
            </p>
          </div>

          <motion.button
            type="button"
            whileTap={TACTILE_TAP}
            transition={SPRING_TACTILE}
            onClick={onCreateCustomPlan}
            className="btn-primary inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-medium transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Create custom plan</span>
          </motion.button>
        </div>

        {/* Guided Goal Quick Matches */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden="true" />
            Quick match:
          </span>
          {QUICK_GOALS.map((goal) => (
            <button
              key={goal.id}
              type="button"
              onClick={() => applyQuickGoal(goal)}
              className="tactile-press inline-flex min-h-8 items-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--text-primary)]"
            >
              {goal.label}
            </button>
          ))}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_PLAN_FINDER_FILTERS)}
              className="tactile-press inline-flex min-h-8 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--color-accent)] hover:underline"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              <span>Reset filters</span>
            </button>
          )}
        </div>

        {/* Search & Fine Filters */}
        <div className="mt-4 grid gap-3 lg:grid-cols-12">
          <div className="relative lg:col-span-5">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={filters.query}
              onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
              placeholder="Search plans or books (Isaiah, Romans…)"
              aria-label="Search reading plans"
              className="folio-input min-h-10 w-full py-2 pr-9 pl-9 text-base placeholder:text-[var(--text-secondary)] sm:text-sm"
            />
            {filters.query.length > 0 && (
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, query: '' }))}
                aria-label="Clear plan search"
                className="absolute right-2.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:col-span-7">
            <div>
              <label htmlFor="finder-length-select" className="sr-only">
                Filter plans by length
              </label>
              <select
                id="finder-length-select"
                value={filters.length}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    length: e.target.value as PlanLengthFilter,
                  }))
                }
                aria-label="Filter plans by length"
                className="folio-input min-h-10 w-full px-3 py-1.5 text-base sm:text-xs"
              >
                <option value="all">Any length</option>
                <option value="short">Short (up to 35 days)</option>
                <option value="medium">Medium (45–90 days)</option>
                <option value="year">Full year (365 days)</option>
              </select>
            </div>

            <div>
              <label htmlFor="finder-pace-select" className="sr-only">
                Filter plans by daily pace
              </label>
              <select
                id="finder-pace-select"
                value={filters.pace}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    pace: e.target.value as PlanPaceFilter,
                  }))
                }
                aria-label="Filter plans by daily pace"
                className="folio-input min-h-10 w-full px-3 py-1.5 text-base sm:text-xs"
              >
                <option value="all">Any daily pace</option>
                <option value="gentle">Gentle (~1 ch/day)</option>
                <option value="steady">Balanced (2–3.5 ch/day)</option>
                <option value="deep">Immersive (4+ ch/day)</option>
              </select>
            </div>

            <div>
              <label htmlFor="finder-sort-select" className="sr-only">
                Sort reading plans
              </label>
              <select
                id="finder-sort-select"
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    sortBy: e.target.value as PlanSortOption,
                  }))
                }
                aria-label="Sort reading plans"
                className="folio-input min-h-10 w-full px-3 py-1.5 text-base sm:text-xs"
              >
                <option value="recommended">Recommended</option>
                <option value="shortest">Shortest first</option>
                <option value="longest">Longest first</option>
                <option value="gentlest">Gentlest daily pace</option>
                <option value="most-progress">Most already read</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scope Category Pills */}
        <div
          className="mt-3.5 flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter plans by scope"
        >
          {SCOPE_OPTIONS.map((opt) => {
            const isSelected = filters.category === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, category: opt.id }))}
                aria-pressed={isSelected}
                className={`tactile-press inline-flex min-h-8 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{opt.label}</span>
                {opt.id === 'custom' && customCount > 0 && (
                  <span className="tabular-nums opacity-80">({customCount})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5 text-xs text-[var(--text-secondary)]">
        <p className="tabular-nums">
          Showing {filteredPlans.length} of {plans.length} reading plans
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_PLAN_FINDER_FILTERS)}
            className="font-medium text-[var(--color-accent)] hover:underline"
          >
            Show all {plans.length} plans
          </button>
        )}
      </div>

      {/* Matching Plan Catalog Cards */}
      {filteredPlans.length === 0 ? (
        <div className="folio-sheet p-8 text-center">
          <p className="font-display text-lg font-medium text-[var(--text-primary)]">
            {filters.category === 'custom' && customCount === 0
              ? 'You have not created a custom plan yet'
              : 'No reading plans match those filters'}
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {filters.category === 'custom' && customCount === 0
              ? 'Design your own reading path from any combination of books, chapter ranges, and daily pace.'
              : 'Try broadening your length or pace filters, or build a custom plan tailored to your schedule.'}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_PLAN_FINDER_FILTERS)}
                className="tactile-press inline-flex min-h-9 items-center rounded-md border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-primary)]"
              >
                Reset filters
              </button>
            )}
            <button
              type="button"
              onClick={onCreateCustomPlan}
              className="btn-primary inline-flex min-h-9 items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Create custom plan</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredPlans.map((plan) => {
            const isActive = plan.id === activePlanId;
            const progress = progressByPlanId[plan.id];
            const coverage = getPlanCoverageMeta(plan);
            const completedDays = progress?.completedDaysCount ?? 0;
            const pct = progress?.percentage ?? 0;
            const isFinished = completedDays >= plan.durationDays;
            const bookNames = getPlanBookNames(plan);
            const previewExpanded = previewPlanId === plan.id;
            const sampleDays = [
              plan.days[0],
              plan.days[1],
              plan.days.length > 4 ? plan.days[Math.floor(plan.days.length / 2)] : null,
              plan.days.length > 2 ? plan.days[plan.days.length - 1] : null,
            ].filter((d, idx, arr): d is NonNullable<typeof d> => Boolean(d) && arr.findIndex((x) => x?.day === d?.day) === idx);

            return (
              <article
                key={plan.id}
                className={`folio-sheet relative flex flex-col justify-between overflow-hidden p-4 sm:p-5 ${
                  isActive ? 'ring-1 ring-[var(--color-accent)]' : ''
                }`}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-1"
                  style={{ backgroundColor: plan.accentColor }}
                />

                <div className="pl-2">
                  {/* Top Metadata Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-[var(--bg-subtle)] px-2 py-0.5 font-medium text-[var(--text-secondary)]">
                        {getPlanCategoryLabel(plan.category)}
                      </span>
                      <span className="text-[var(--text-secondary)]">
                        {getPlanOrderLabel(plan.order)}
                      </span>
                    </div>

                    {isFinished ? (
                      <span className="inline-flex items-center gap-1 font-medium text-[var(--color-sage)]">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Completed
                      </span>
                    ) : isActive ? (
                      <span className="inline-flex items-center gap-1 font-medium text-[var(--color-accent)]">
                        <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                        Active plan
                      </span>
                    ) : shelfIdsSet?.has(plan.id) ? (
                      <span className="rounded bg-[var(--bg-subtle)] px-2 py-0.5 text-[0.7rem] font-medium text-[var(--text-secondary)]">
                        On shelf
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-2 font-display text-xl font-medium leading-snug text-[var(--text-primary)]">
                    {plan.title}
                  </h3>

                  <p className="mt-1.5 max-w-[58ch] text-sm leading-relaxed text-[var(--text-secondary)]">
                    {plan.description}
                  </p>

                  {/* Metrics Row */}
                  <dl className="mt-3.5 grid grid-cols-3 divide-x divide-[var(--border-subtle)] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-center">
                    <div className="px-2 py-1.5">
                      <dt className="text-[0.68rem] text-[var(--text-secondary)]">Length</dt>
                      <dd className="text-xs font-medium tabular-nums text-[var(--text-primary)]">
                        {plan.durationDays} {plan.durationDays === 1 ? 'day' : 'days'}
                      </dd>
                    </div>
                    <div className="px-2 py-1.5">
                      <dt className="text-[0.68rem] text-[var(--text-secondary)]">Daily pace</dt>
                      <dd className="text-xs font-medium tabular-nums text-[var(--text-primary)]">
                        ~{coverage.avgChaptersPerDay} ch/day
                      </dd>
                    </div>
                    <div className="px-2 py-1.5">
                      <dt className="text-[0.68rem] text-[var(--text-secondary)]">Coverage</dt>
                      <dd className="text-xs font-medium tabular-nums text-[var(--text-primary)]">
                        {coverage.bookCount} {coverage.bookCount === 1 ? 'book' : 'books'} ({coverage.totalChapters} ch)
                      </dd>
                    </div>
                  </dl>

                  {/* Sample Books Covered */}
                  <div className="mt-3 flex items-start gap-1.5 text-[0.7rem] text-[var(--text-secondary)]">
                    <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 leading-snug">
                      {bookNames.slice(0, 4).join(', ')}
                      {bookNames.length > 4 ? `, and ${bookNames.length - 4} more` : ''}
                    </span>
                  </div>

                  {/* Ledger Sync Progress */}
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between gap-2 text-xs tabular-nums text-[var(--text-secondary)]">
                      <span>
                        {completedDays > 0
                          ? `${completedDays} of ${plan.durationDays} days already read`
                          : `0 of ${plan.durationDays} days read`}
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
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

                  {/* Expandable Schedule Preview */}
                  {previewExpanded && (
                    <div className="mt-3.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-xs">
                      <p className="font-medium text-[var(--text-primary)]">
                        Sample schedule checkpoints
                      </p>
                      <ul className="mt-2 space-y-1.5 text-[var(--text-secondary)]">
                        {sampleDays.map((day) => (
                          <li key={day.day} className="flex items-baseline justify-between gap-3">
                            <span className="shrink-0 font-medium tabular-nums text-[var(--text-primary)]">
                              Day {day.day}
                            </span>
                            <span className="truncate text-right">{day.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3.5 pl-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewPlanId((prev) => (prev === plan.id ? null : plan.id))
                      }
                      aria-expanded={previewExpanded}
                      className="tactile-press inline-flex min-h-9 items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                    >
                      {previewExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>{previewExpanded ? 'Hide preview' : 'Preview schedule'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onCustomizeCopy(plan)}
                      className="tactile-press inline-flex min-h-9 items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Customize copy</span>
                    </button>

                    {plan.isCustom && (
                      <>
                        <button
                          type="button"
                          onClick={() => onEditCustomPlan(plan)}
                          aria-label={`Edit ${plan.title}`}
                          className="tactile-press inline-flex min-h-9 items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                        >
                          <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Edit</span>
                        </button>

                        {confirmDeleteId === plan.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteId(null);
                                void onDeleteCustomPlan(plan.id);
                              }}
                              className="btn-danger tactile-press inline-flex min-h-9 items-center rounded-md px-2.5 py-1 text-xs font-medium"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="tactile-press inline-flex min-h-9 items-center rounded-md border border-[var(--border-subtle)] px-2 py-1 text-xs font-medium text-[var(--text-secondary)]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(plan.id)}
                            aria-label={`Delete ${plan.title}`}
                            className="tactile-press inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] transition-colors hover:border-[var(--color-crimson)]/45 hover:text-[var(--color-crimson)]"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <motion.button
                    type="button"
                    whileTap={TACTILE_TAP}
                    transition={SPRING_TACTILE}
                    onClick={() => onSelectPlan(plan.id)}
                    className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-90 ${
                      isActive
                        ? 'border border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                        : 'btn-primary'
                    }`}
                  >
                    <span>{isActive ? 'Open active plan' : 'Start plan'}</span>
                  </motion.button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
