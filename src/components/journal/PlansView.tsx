import React, { useMemo } from 'react';
import { Check, CheckCircle2, Compass } from 'lucide-react';
import { READING_PLANS } from '../../data/readingPlans';
import { todayPlainDate } from '../../lib/dates';
import { useBibleStore } from '../../store/useBibleStore';

export const PlansView: React.FC = () => {
  const { preferences, summary, updatePreferences, logChapters } = useBibleStore();

  const activePlan = useMemo(
    () => READING_PLANS.find((p) => p.id === preferences.activePlanId) ?? READING_PLANS[0],
    [preferences.activePlanId]
  );

  const dayStatuses = useMemo(() => {
    return activePlan.days.map((day) => {
      const done = day.assignments.every((a) => {
        const bp = summary.bookProgressById[a.bookId];
        return a.chapters.every((ch) => Boolean(bp?.chapterMap[ch]));
      });
      return { day, done };
    });
  }, [activePlan.days, summary.bookProgressById]);

  const completedDaysCount = dayStatuses.filter((d) => d.done).length;
  const nextPendingIndex = dayStatuses.findIndex((d) => !d.done);
  const startWindow = Math.max(0, nextPendingIndex === -1 ? 0 : nextPendingIndex - 1);
  const visibleDays = dayStatuses.slice(startWindow, startWindow + 12);

  const handleCompletePlanDay = async (dayNumber: number) => {
    const targetDay = activePlan.days.find((d) => d.day === dayNumber);
    if (!targetDay) return;
    const today = todayPlainDate();
    for (const assignment of targetDay.assignments) {
      const bp = summary.bookProgressById[assignment.bookId];
      const unread = assignment.chapters.filter((ch) => !bp?.chapterMap[ch]);
      if (unread.length > 0) {
        await logChapters({
          bookId: assignment.bookId,
          chapters: unread,
          readDate: today,
          planId: activePlan.id,
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Plan Cards */}
      <div className="grid gap-3.5 sm:grid-cols-2">
        {READING_PLANS.map((plan) => {
          const isSelected = plan.id === activePlan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => void updatePreferences({ activePlanId: plan.id })}
              aria-pressed={isSelected}
              className={`sanctuary-card relative overflow-hidden p-4 text-left transition-colors ${
                isSelected
                  ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]'
                  : 'hover:border-[var(--border-strong)]'
              }`}
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-1.5"
                style={{ backgroundColor: plan.accentColor }}
              />
              <div className="pl-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                    {plan.subtitle}
                  </span>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-[0.68rem] font-semibold text-[var(--color-accent)]">
                      <Compass className="h-3 w-3" aria-hidden="true" />
                      Active
                    </span>
                  )}
                </div>
                <h3 className="mt-1 font-display text-lg font-semibold text-[var(--text-primary)]">
                  {plan.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {plan.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Plan Daily Schedule */}
      <section className="sanctuary-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-semibold text-[var(--text-primary)]">
              {activePlan.title}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] tabular-nums">
              {completedDaysCount} of {activePlan.durationDays} days synced with your chapter logs
            </p>
          </div>

          <div className="w-full max-w-xs">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
              <div
                className="h-full rounded-full bg-[var(--color-sage)] transition-[width] duration-500"
                style={{
                  width: `${(completedDaysCount / activePlan.durationDays) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        <ul className="mt-5 divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          {visibleDays.map(({ day, done }) => (
            <li
              key={day.day}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                    done
                      ? 'bg-[var(--color-sage-soft)] text-[var(--color-sage)]'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                  }`}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden="true" /> : day.day}
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Day {day.day}
                  </p>
                  <p className="font-display text-base font-medium text-[var(--text-primary)]">
                    {day.title}
                  </p>
                </div>
              </div>

              {done ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-sage)]">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Completed
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleCompletePlanDay(day.day)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-95"
                >
                  Log Day {day.day}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
