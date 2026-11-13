import React from 'react';
import { motion } from 'motion/react';
import { SPRING_TACTILE, TACTILE_PILL_TAP } from '../../lib/motion';
import type { PlanDayStatus, PlanStage } from '../../lib/plans';
import type { ReadingLogEntry, ReadingPlan } from '../../types/bible';

interface PlanJourneyMatrixProps {
  plan: ReadingPlan;
  stages: PlanStage[];
  selectedStageIndex: number;
  selectedDayNumber: number | null;
  nextPendingDayNumber: number | null;
  notesByDay: Record<number, ReadingLogEntry[]>;
  onSelectStage: (stageIndex: number) => void;
  onSelectDay: (dayNumber: number, stageIndex: number) => void;
}

export const PlanJourneyMatrix: React.FC<PlanJourneyMatrixProps> = ({
  plan,
  stages,
  selectedStageIndex,
  selectedDayNumber,
  nextPendingDayNumber,
  notesByDay,
  onSelectStage,
  onSelectDay,
}) => {
  const showAllStagesInline = plan.durationDays <= 45;
  const activeStage = stages[selectedStageIndex] ?? stages[0];

  const renderDayCell = (status: PlanDayStatus, stageIdx: number, fillCell = false) => {
    const dayNum = status.day.day;
    const isNext = nextPendingDayNumber === dayNum;
    const isSelected = selectedDayNumber === dayNum;
    const hasNotes = Boolean(notesByDay[dayNum]?.length);

    let stateClass =
      'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]';
    if (status.done) {
      stateClass =
        'border-[color-mix(in_oklab,var(--color-sage)_55%,var(--border-subtle))] bg-[var(--color-sage-soft)] text-[var(--color-sage)]';
    } else if (status.partial) {
      stateClass =
        'border-[color-mix(in_oklab,var(--color-lamp)_65%,var(--border-subtle))] bg-[var(--color-lamp-soft)] text-[var(--color-lamp)]';
    } else if (isNext) {
      stateClass =
        'border-2 border-[var(--color-accent)] bg-[var(--color-accent-soft)] font-semibold text-[var(--color-accent)]';
    }

    const statusWord = status.done
      ? 'completed'
      : status.partial
        ? `in progress (${status.readChaptersCount} of ${status.totalChaptersCount} chapters)`
        : isNext
          ? 'up next'
          : 'upcoming';

    const sizeClass = fillCell ? 'h-9 w-full sm:h-8' : 'h-9 w-9 sm:h-8 sm:w-8';

    return (
      <motion.button
        key={dayNum}
        type="button"
        whileTap={TACTILE_PILL_TAP}
        transition={SPRING_TACTILE}
        onClick={() => onSelectDay(dayNum, stageIdx)}
        aria-pressed={isSelected}
        aria-label={`Day ${dayNum}: ${status.day.title}, ${statusWord}${hasNotes ? ', has reflection note' : ''}`}
        title={`Day ${dayNum}: ${status.day.title}`}
        className={`relative inline-flex ${sizeClass} items-center justify-center rounded-[5px] border text-xs font-medium tabular-nums transition-colors ${stateClass} ${
          isSelected
            ? 'ring-2 ring-[var(--text-primary)] ring-offset-1 ring-offset-[var(--bg-elevated)]'
            : ''
        }`}
      >
        <span>{dayNum}</span>
        {hasNotes && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[var(--color-lamp)]"
          />
        )}
      </motion.button>
    );
  };

  return (
    <section aria-labelledby="journey-map-heading" className="folio-sheet p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--border-subtle)] pb-3.5">
        <div>
          <h2
            id="journey-map-heading"
            className="font-display text-lg font-medium text-[var(--text-primary)] sm:text-xl"
          >
            Journey Map
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Select any {showAllStagesInline ? 'day' : 'stage or day'} to inspect its passages in
            the itinerary below.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-[3px] border border-[color-mix(in_oklab,var(--color-sage)_55%,var(--border-subtle))] bg-[var(--color-sage-soft)]"
            />
            Done
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-[3px] border border-[color-mix(in_oklab,var(--color-lamp)_65%,var(--border-subtle))] bg-[var(--color-lamp-soft)]"
            />
            Partial
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-[3px] border-2 border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
            />
            Up next
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-[var(--color-lamp)]"
            />
            Note
          </span>
        </div>
      </div>

      {showAllStagesInline ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)]/55 p-3"
            >
              <div className="mb-2 flex items-baseline justify-between gap-2 text-xs">
                <span className="font-medium text-[var(--text-primary)]">{stage.label}</span>
                <span className="tabular-nums text-[var(--text-secondary)]">
                  {stage.completedCount}/{stage.days.length}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {stage.days.map((dayStatus) => renderDayCell(dayStatus, stage.index, true))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Stage Tiles for 90-day & 365-day Plans */}
          <div
            className="grid grid-cols-3 gap-2 sm:grid-cols-6"
            role="group"
            aria-label="Select plan stage"
          >
            {stages.map((stage) => {
              const isStageActive = stage.index === selectedStageIndex;
              const stagePct = Math.round((stage.completedCount / stage.days.length) * 100);
              const stageDone = stage.completedCount === stage.days.length;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => onSelectStage(stage.index)}
                  aria-pressed={isStageActive}
                  className={`tactile-press rounded-md border px-2.5 py-2 text-left transition-colors ${
                    isStageActive
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]/55'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-1 text-xs">
                    <span className="font-medium text-[var(--text-primary)]">{stage.label}</span>
                    <span className="tabular-nums text-[0.7rem] text-[var(--text-secondary)]">
                      {stage.completedCount}/{stage.days.length}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[0.68rem] tabular-nums text-[var(--text-secondary)]">
                    Days {stage.startDay}–{stage.endDay}
                  </p>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{
                        width: `${stagePct}%`,
                        backgroundColor: stageDone ? 'var(--color-sage)' : plan.accentColor,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Individual Days Inside Selected Stage */}
          {activeStage && (
            <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)]/55 p-3.5">
              <div className="mb-2.5 flex items-baseline justify-between gap-2 text-xs">
                <span className="font-medium text-[var(--text-primary)]">
                  {activeStage.label} (Days {activeStage.startDay}–{activeStage.endDay})
                </span>
                <span className="tabular-nums text-[var(--text-secondary)]">
                  {activeStage.completedCount} of {activeStage.days.length} completed
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeStage.days.map((dayStatus) => renderDayCell(dayStatus, activeStage.index))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
