import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ScrollText,
} from 'lucide-react';
import { CORE_DEFAULT_PLAN_IDS } from '../../data/readingPlans';
import { extractSectionsFromPlan } from '../../lib/customPlans';
import { formatPlainDate, todayPlainDate } from '../../lib/dates';
import { SPRING_SEAL, SPRING_TACTILE, TACTILE_PILL_TAP, TACTILE_TAP } from '../../lib/motion';
import {
  buildPlanStages,
  computePlanProgress,
  getActiveReadingPlan,
  getPlanCoverageMeta,
  getReadingPlanById,
  getShelfPlans,
  getUnreadAssignmentsForDay,
  matchPlanDayNotes,
  sanitizeShelfPlanIds,
  type PlanProgressState,
} from '../../lib/plans';
import { useBibleStore, type SaveCustomPlanInput } from '../../store/useBibleStore';
import type { ReadingPlan } from '../../types/bible';
import { ActivePlanFocusCard } from './ActivePlanFocusCard';
import { CustomPlanBuilder, type CustomPlanDraft } from './CustomPlanBuilder';
import { PlanFinderView } from './PlanFinderView';
import { PlanJourneyMatrix } from './PlanJourneyMatrix';
import { PlanSelectorStrip } from './PlanSelectorStrip';

interface PlansViewProps {
  onOpenBook?: (bookId: string) => void;
  onInspectJournalNotes?: (queryText: string) => void;
}

type ItineraryFilter = 'up-next' | 'stage' | 'completed';
type PlansScreenMode = 'workspace' | 'finder' | 'builder';

export const PlansView: React.FC<PlansViewProps> = ({
  onOpenBook = () => {},
  onInspectJournalNotes,
}) => {
  const {
    preferences,
    summary,
    logs,
    customReadingPlans,
    allPlans,
    updatePreferences,
    activateReadingPlan,
    removePlanFromShelf,
    restoreDefaultShelfPlans,
    logChapters,
    saveCustomPlan,
    removeCustomPlan,
  } = useBibleStore();

  const [mode, setMode] = useState<PlansScreenMode>('workspace');
  const [builderDraft, setBuilderDraft] = useState<CustomPlanDraft | undefined>(undefined);
  const [builderReturnMode, setBuilderReturnMode] = useState<'workspace' | 'finder'>('workspace');
  const [recentlyRemoved, setRecentlyRemoved] = useState<{
    planId: string;
    title: string;
    prevShelfPlanIds: string[];
    prevActivePlanId: string | null;
  } | null>(null);

  const activePlan = useMemo(
    () => getActiveReadingPlan(preferences.activePlanId, customReadingPlans),
    [customReadingPlans, preferences.activePlanId]
  );

  const progressByPlanId = useMemo(() => {
    const map: Record<string, PlanProgressState> = {};
    for (const plan of allPlans) {
      map[plan.id] = computePlanProgress(plan, summary);
    }
    return map;
  }, [allPlans, summary]);

  const shelfPlans = useMemo(
    () => getShelfPlans(allPlans, preferences.activePlanId, preferences.shelfPlanIds),
    [allPlans, preferences.activePlanId, preferences.shelfPlanIds]
  );

  const hasActiveShelfPlan =
    shelfPlans.length > 0 && preferences.activePlanId !== null;

  const activeProgress = progressByPlanId[activePlan.id];
  const coverage = useMemo(() => getPlanCoverageMeta(activePlan), [activePlan]);
  const stages = useMemo(
    () => buildPlanStages(activePlan, activeProgress.dayStatuses),
    [activePlan, activeProgress.dayStatuses]
  );
  const notesByDay = useMemo(
    () => matchPlanDayNotes(activePlan, logs),
    [activePlan, logs]
  );

  const defaultStageIndex = useMemo(() => {
    const nextDayNum = activeProgress.nextDay?.day;
    if (!nextDayNum) return 0;
    const found = stages.findIndex(
      (s) => nextDayNum >= s.startDay && nextDayNum <= s.endDay
    );
    return found >= 0 ? found : 0;
  }, [activeProgress.nextDay, stages]);

  const [itineraryFilter, setItineraryFilter] = useState<ItineraryFilter>('up-next');
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(defaultStageIndex);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);
  const [expandedNoteDays, setExpandedNoteDays] = useState<Set<number>>(() => new Set());

  const prevPlanIdRef = useRef(activePlan.id);

  useEffect(() => {
    if (prevPlanIdRef.current !== activePlan.id) {
      prevPlanIdRef.current = activePlan.id;
      setSelectedStageIndex(defaultStageIndex);
      setSelectedDayNumber(null);
      setItineraryFilter('up-next');
      setExpandedNoteDays(new Set());
    }
  }, [activePlan.id, defaultStageIndex]);

  const safeStageIndex = Math.min(selectedStageIndex, Math.max(0, stages.length - 1));
  const activeStage = stages[safeStageIndex] ?? stages[0];

  const visibleDays = useMemo(() => {
    if (itineraryFilter === 'completed') {
      return activeProgress.dayStatuses.filter((d) => d.done);
    }
    if (itineraryFilter === 'stage' && activeStage) {
      return activeStage.days;
    }
    const startWindow = Math.max(
      0,
      activeProgress.nextPendingIndex === -1 ? 0 : activeProgress.nextPendingIndex - 1
    );
    return activeProgress.dayStatuses.slice(startWindow, startWindow + 12);
  }, [activeProgress, activeStage, itineraryFilter]);

  const handleLogPlanDay = async (
    dayNumber: number,
    options?: { readDate?: string; note?: string }
  ) => {
    const targetDay = activePlan.days.find((d) => d.day === dayNumber);
    if (!targetDay) return;
    const dateToUse = options?.readDate || todayPlainDate();
    const trimmedNote = options?.note?.trim() || '';
    const unreadAssignments = getUnreadAssignmentsForDay(targetDay, summary);

    for (let i = 0; i < unreadAssignments.length; i++) {
      const assignment = unreadAssignments[i];
      await logChapters({
        bookId: assignment.bookId,
        chapters: assignment.chapters,
        readDate: dateToUse,
        note: i === 0 && trimmedNote ? trimmedNote : undefined,
        planId: activePlan.id,
      });
    }
  };

  const handleSelectStage = (stageIndex: number) => {
    setSelectedStageIndex(stageIndex);
    setSelectedDayNumber(null);
    setItineraryFilter('stage');
  };

  const handleSelectDayFromMatrix = (dayNumber: number, stageIndex: number) => {
    setSelectedStageIndex(stageIndex);
    setSelectedDayNumber(dayNumber);
    setItineraryFilter('stage');
    if (typeof document !== 'undefined') {
      window.setTimeout(() => {
        const el = document.getElementById(`plan-day-${dayNumber}`);
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 40);
    }
  };

  const toggleDayNotes = (dayNumber: number) => {
    setExpandedNoteDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayNumber)) {
        next.delete(dayNumber);
      } else {
        next.add(dayNumber);
      }
      return next;
    });
  };

  const openNewBuilder = (returnTo: 'workspace' | 'finder' = 'workspace') => {
    setBuilderDraft(undefined);
    setBuilderReturnMode(returnTo);
    setMode('builder');
  };

  const openEditBuilder = (
    plan: ReadingPlan,
    returnTo: 'workspace' | 'finder' = 'workspace'
  ) => {
    if (!plan.customDefinition) return;
    setBuilderDraft({
      id: plan.customDefinition.id,
      title: plan.customDefinition.title,
      description: plan.customDefinition.description,
      sections: plan.customDefinition.sections,
      durationDays: plan.customDefinition.durationDays,
      accentColor: plan.customDefinition.accentColor,
    });
    setBuilderReturnMode(returnTo);
    setMode('builder');
  };

  const openCopyBuilder = (
    plan: ReadingPlan,
    returnTo: 'workspace' | 'finder' = 'workspace'
  ) => {
    setBuilderDraft({
      title: `${plan.title} (Custom)`,
      description: plan.description,
      sections: extractSectionsFromPlan(plan),
      durationDays: plan.durationDays,
      accentColor: plan.accentColor,
    });
    setBuilderReturnMode(returnTo);
    setMode('builder');
  };

  const handleRemoveFromShelf = (planId: string) => {
    const target = getReadingPlanById(planId, customReadingPlans);
    const prevShelfPlanIds = sanitizeShelfPlanIds(
      preferences.shelfPlanIds,
      CORE_DEFAULT_PLAN_IDS
    );
    setRecentlyRemoved({
      planId,
      title: target?.title ?? 'Reading plan',
      prevShelfPlanIds,
      prevActivePlanId: preferences.activePlanId,
    });
    void removePlanFromShelf(planId);
  };

  const handleUndoRemove = () => {
    if (!recentlyRemoved) return;
    void updatePreferences({
      shelfPlanIds: recentlyRemoved.prevShelfPlanIds,
      activePlanId: recentlyRemoved.prevActivePlanId,
    });
    setRecentlyRemoved(null);
  };

  const handleSaveBuilderPlan = async (
    input: SaveCustomPlanInput,
    options: { activate: boolean }
  ) => {
    setRecentlyRemoved(null);
    const created = await saveCustomPlan(input, options);
    if (options.activate || created.id === activePlan.id) {
      setMode('workspace');
    } else {
      setMode('finder');
    }
    return created;
  };

  if (mode === 'finder') {
    return (
      <PlanFinderView
        plans={allPlans}
        activePlanId={hasActiveShelfPlan ? activePlan.id : null}
        shelfPlanIds={preferences.shelfPlanIds}
        progressByPlanId={progressByPlanId}
        onSelectPlan={(planId) => {
          setRecentlyRemoved(null);
          void activateReadingPlan(planId);
          setMode('workspace');
        }}
        onClose={() => setMode('workspace')}
        onCreateCustomPlan={() => openNewBuilder('finder')}
        onEditCustomPlan={(plan) => openEditBuilder(plan, 'finder')}
        onCustomizeCopy={(plan) => openCopyBuilder(plan, 'finder')}
        onDeleteCustomPlan={async (id) => {
          setRecentlyRemoved(null);
          await removeCustomPlan(id);
        }}
      />
    );
  }

  if (mode === 'builder') {
    return (
      <CustomPlanBuilder
        initialDraft={builderDraft}
        onSave={handleSaveBuilderPlan}
        onCancel={() => setMode(builderReturnMode)}
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* Compact Lectionary Shelf + Finder / Custom Launchers */}
      <PlanSelectorStrip
        plans={shelfPlans}
        totalCatalogCount={allPlans.length}
        activePlanId={hasActiveShelfPlan ? activePlan.id : null}
        progressByPlanId={progressByPlanId}
        recentlyRemoved={recentlyRemoved}
        onUndoRemove={handleUndoRemove}
        onDismissRemovedNotice={() => setRecentlyRemoved(null)}
        onSelectPlan={(planId) => {
          setRecentlyRemoved(null);
          void activateReadingPlan(planId);
        }}
        onRemoveFromShelf={handleRemoveFromShelf}
        onDeleteCustomPlan={async (id) => {
          setRecentlyRemoved(null);
          await removeCustomPlan(id);
        }}
        onRestoreStarterPlans={() => {
          setRecentlyRemoved(null);
          void restoreDefaultShelfPlans();
        }}
        onOpenFinder={() => setMode('finder')}
        onCreateCustomPlan={() => openNewBuilder('workspace')}
      />

      {hasActiveShelfPlan && (
        <>
          {/* Active Plan Overview + Up Next Reading Focus */}
          <ActivePlanFocusCard
            plan={activePlan}
            progress={activeProgress}
            coverage={coverage}
            onOpenBook={onOpenBook}
            onLogDay={handleLogPlanDay}
            onCustomizeCopy={(plan) => openCopyBuilder(plan, 'workspace')}
            onEditCustomPlan={(plan) => openEditBuilder(plan, 'workspace')}
            onDeleteCustomPlan={async (id) => {
              setRecentlyRemoved(null);
              await removeCustomPlan(id);
            }}
          />

          {/* Interactive Journey Map */}
          <PlanJourneyMatrix
            plan={activePlan}
            stages={stages}
            selectedStageIndex={safeStageIndex}
            selectedDayNumber={selectedDayNumber}
            nextPendingDayNumber={activeProgress.nextDay?.day ?? null}
            notesByDay={notesByDay}
            onSelectStage={handleSelectStage}
            onSelectDay={handleSelectDayFromMatrix}
          />

          {/* Browsable Daily Itinerary */}
          <section aria-labelledby="plan-itinerary-heading" className="folio-sheet p-4 sm:p-7">
        <div className="flex flex-col justify-between gap-3.5 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div>
            <h2
              id="plan-itinerary-heading"
              className="font-display text-xl font-medium text-[var(--text-primary)] sm:text-2xl"
            >
              Daily Itinerary
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)] tabular-nums">
              {itineraryFilter === 'stage' && activeStage
                ? `${activeStage.label}: Days ${activeStage.startDay}–${activeStage.endDay} (${activeStage.completedCount} of ${activeStage.days.length} completed)`
                : itineraryFilter === 'completed'
                  ? `${activeProgress.completedDaysCount} completed ${activeProgress.completedDaysCount === 1 ? 'day' : 'days'} in ${activePlan.title}`
                  : `Showing up to 12 days centered on your next reading`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div
              className="grid grid-cols-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 text-xs font-medium sm:inline-flex"
              role="group"
              aria-label="Filter plan itinerary"
            >
              {(
                [
                  { id: 'up-next', label: 'Up next' },
                  { id: 'stage', label: 'By stage' },
                  { id: 'completed', label: 'Completed' },
                ] as const
              ).map((opt) => {
                const isActive = itineraryFilter === opt.id;
                return (
                  <motion.button
                    key={opt.id}
                    type="button"
                    whileTap={TACTILE_PILL_TAP}
                    onClick={() => setItineraryFilter(opt.id)}
                    aria-pressed={isActive}
                    className={`relative min-h-9 rounded-[4px] px-2.5 py-1.5 whitespace-nowrap transition-colors sm:min-h-0 ${
                      isActive
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="plan-itinerary-filter-pill"
                        transition={SPRING_TACTILE}
                        aria-hidden="true"
                        className="absolute inset-0 rounded-[4px] bg-[var(--bg-elevated)] shadow-2xs"
                      />
                    )}
                    <span className="relative z-10">{opt.label}</span>
                  </motion.button>
                );
              })}
            </div>

            {itineraryFilter === 'stage' && stages.length > 1 && (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSelectStage(Math.max(0, safeStageIndex - 1))}
                  disabled={safeStageIndex === 0}
                  aria-label="Previous stage"
                  className="tactile-press inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <select
                  aria-label="Choose plan stage"
                  value={safeStageIndex}
                  onChange={(e) => handleSelectStage(Number(e.target.value))}
                  className="folio-input min-h-9 px-2.5 py-1 text-base font-medium sm:text-xs"
                >
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.index}>
                      {stage.label} (Days {stage.startDay}–{stage.endDay})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    handleSelectStage(Math.min(stages.length - 1, safeStageIndex + 1))
                  }
                  disabled={safeStageIndex >= stages.length - 1}
                  aria-label="Next stage"
                  className="tactile-press inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>

        {visibleDays.length === 0 ? (
          <div className="mt-5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-8 text-center">
            <p className="font-display text-lg font-medium text-[var(--text-primary)]">
              No completed days yet in {activePlan.title}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Log Day 1 above or read any assigned chapters to begin tracking this plan.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--border-subtle)] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] sm:mt-5">
            {visibleDays.map((dayStatus) => {
              const { day, done, partial } = dayStatus;
              const isSelected = selectedDayNumber === day.day;
              const isNext = activeProgress.nextDay?.day === day.day;
              const dayNotes = notesByDay[day.day] ?? [];
              const notesExpanded = expandedNoteDays.has(day.day);

              return (
                <li
                  key={day.day}
                  id={`plan-day-${day.day}`}
                  className={`scroll-mt-24 px-4 py-3.5 transition-colors ${
                    isSelected ? 'bg-[var(--color-accent-soft)]/35' : ''
                  }`}
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 items-start gap-3.5">
                      <motion.span
                        key={done ? `done-${day.day}` : `todo-${day.day}`}
                        initial={done ? { scale: 0.72 } : false}
                        animate={{ scale: 1 }}
                        transition={SPRING_SEAL}
                        className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                          done
                            ? 'bg-[var(--color-sage-soft)] text-[var(--color-sage)]'
                            : partial
                              ? 'border border-[var(--color-lamp)] bg-[var(--color-lamp-soft)] text-[var(--color-lamp)]'
                              : isNext
                                ? 'border-2 border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                                : 'border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {done ? <Check className="h-4 w-4" aria-hidden="true" /> : day.day}
                      </motion.span>

                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-medium tabular-nums text-[var(--text-secondary)]">
                            Day {day.day}
                          </span>
                          {partial ? (
                            <span className="rounded bg-[var(--color-lamp-soft)] px-1.5 py-0.5 text-[0.68rem] font-medium tabular-nums text-[var(--color-lamp)]">
                              {dayStatus.readChaptersCount}/{dayStatus.totalChaptersCount} chapters
                            </span>
                          ) : null}
                          {isNext && !partial ? (
                            <span className="rounded bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[0.68rem] font-medium text-[var(--color-accent)]">
                              Up next
                            </span>
                          ) : null}
                        </div>

                        <p className="font-display text-base font-medium leading-snug text-[var(--text-primary)]">
                          {day.title}
                        </p>

                        {/* Interactive Assignment Pills */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {dayStatus.assignmentStatuses.map((assignment) => (
                            <button
                              key={`${day.day}-${assignment.bookId}`}
                              type="button"
                              onClick={() => onOpenBook(assignment.bookId)}
                              className={`tactile-press inline-flex min-h-7 items-center gap-1.5 rounded border px-2 py-0.5 text-xs transition-colors ${
                                assignment.done
                                  ? 'border-[var(--color-sage)]/40 bg-[var(--color-sage-soft)]/60 text-[var(--color-sage)]'
                                  : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              <span
                                aria-hidden="true"
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: assignment.divisionColorVar }}
                              />
                              <span>{assignment.chapterRangeLabel}</span>
                              {!assignment.done && assignment.readChaptersCount > 0 && (
                                <span className="tabular-nums opacity-80">
                                  ({assignment.readChaptersCount}/{assignment.totalChaptersCount})
                                </span>
                              )}
                            </button>
                          ))}

                          {dayNotes.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleDayNotes(day.day)}
                              aria-expanded={notesExpanded}
                              className="tactile-press inline-flex min-h-7 items-center gap-1 rounded border border-[color-mix(in_oklab,var(--color-lamp)_45%,var(--border-subtle))] bg-[var(--color-lamp-soft)]/65 px-2 py-0.5 text-xs font-medium text-[var(--color-lamp)] transition-colors hover:bg-[var(--color-lamp-soft)]"
                            >
                              <ScrollText className="h-3 w-3" aria-hidden="true" />
                              <span>
                                {dayNotes.length}{' '}
                                {dayNotes.length === 1 ? 'reflection' : 'reflections'}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 pl-11 sm:pl-0">
                      {done ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-sage)]">
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          Completed
                        </span>
                      ) : (
                        <motion.button
                          type="button"
                          whileTap={TACTILE_TAP}
                          transition={SPRING_TACTILE}
                          onClick={() => void handleLogPlanDay(day.day)}
                          className={`inline-flex min-h-10 w-full items-center justify-center rounded-md px-3.5 py-2 text-xs font-medium transition-colors sm:min-h-9 sm:w-auto sm:py-1.5 ${
                            isNext
                              ? 'btn-primary hover:opacity-90'
                              : 'border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                          }`}
                        >
                          Log Day {day.day}
                        </motion.button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Day Reflections */}
                  {notesExpanded && dayNotes.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-[var(--border-subtle)]/70 pt-3 pl-11">
                      {dayNotes.map((entry) => {
                        const firstBook = dayStatus.assignmentStatuses.find(
                          (a) => a.bookId === entry.bookId
                        );
                        return (
                          <div
                            key={entry.id}
                            className="flex flex-col justify-between gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 sm:flex-row sm:items-start"
                          >
                            <div className="min-w-0">
                              <p className="text-xs text-[var(--text-secondary)] tabular-nums">
                                {formatPlainDate(entry.readDate)}
                              </p>
                              <p className="mt-1 max-w-[62ch] font-display text-sm leading-relaxed text-[var(--text-primary)]">
                                {entry.note}
                              </p>
                            </div>
                            {onInspectJournalNotes && firstBook && (
                              <button
                                type="button"
                                onClick={() => onInspectJournalNotes(firstBook.bookName)}
                                className="tactile-press inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--color-accent)] hover:underline"
                              >
                                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Open in journal</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
        </>
      )}
    </div>
  );
};
