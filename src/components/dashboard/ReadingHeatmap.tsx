import React, { useEffect, useMemo, useRef, useState } from 'react';
import { buildHeatmapCalendar, formatPlainDate, todayPlainDate } from '../../lib/dates';
import { buildDailyChapterCounts } from '../../lib/progress';
import { useBibleStore } from '../../store/useBibleStore';

function levelForCount(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

const LEVEL_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'var(--bg-subtle)',
  1: 'color-mix(in oklab, var(--color-accent) 30%, var(--bg-subtle))',
  2: 'color-mix(in oklab, var(--color-accent) 62%, var(--bg-subtle))',
  3: 'var(--color-accent)',
  4: 'var(--color-lamp)',
};

export const ReadingHeatmap: React.FC = () => {
  const { logs, summary } = useBibleStore();
  const today = todayPlainDate();
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number } | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ date: string; count: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el && el.scrollWidth > el.clientWidth) {
      el.scrollLeft = el.scrollWidth;
    }
  }, []);

  const inspectedDay = hoveredDay ?? selectedDay;

  const dailyCounts = useMemo(() => buildDailyChapterCounts(logs), [logs]);
  const { days, monthLabels } = useMemo(() => buildHeatmapCalendar(today, 52), [today]);

  const weeks = useMemo(() => {
    const cols: typeof days[] = [];
    for (let w = 0; w < 52; w++) {
      cols.push(days.slice(w * 7, w * 7 + 7));
    }
    return cols;
  }, [days]);

  const monthlySummary = useMemo(() => {
    const map = new Map<string, { chapters: number; activeDays: number }>();
    for (const [date, count] of Object.entries(dailyCounts)) {
      const monthKey = date.slice(0, 7);
      const prev = map.get(monthKey) ?? { chapters: 0, activeDays: 0 };
      map.set(monthKey, {
        chapters: prev.chapters + count,
        activeDays: prev.activeDays + 1,
      });
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6);
  }, [dailyCounts]);

  return (
    <section className="folio-sheet p-4 sm:p-7" aria-labelledby="heatmap-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--border-subtle)] pb-4 sm:gap-4">
        <div>
          <h2
            id="heatmap-heading"
            className="font-display text-2xl font-medium text-[var(--text-primary)]"
          >
            52-Week Reading Cadence
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)] tabular-nums">
            {summary.activeDaysCount} active reading days, averaging {summary.chaptersPerWeekAvg} chapters per week
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span>Fewer</span>
          {([0, 1, 2, 3, 4] as const).map((lvl) => (
            <span
              key={lvl}
              aria-hidden="true"
              className="inline-block h-3 w-3 rounded-[2px]"
              style={{ backgroundColor: LEVEL_COLORS[lvl] }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Live readout bar */}
      <div className="mt-4 min-h-5 text-xs font-medium text-[var(--text-secondary)] tabular-nums">
        {inspectedDay ? (
          <span>
            <strong className="font-semibold text-[var(--text-primary)]">
              {formatPlainDate(inspectedDay.date)}
            </strong>{' '}
            — {inspectedDay.count} {inspectedDay.count === 1 ? 'chapter' : 'chapters'} read
          </span>
        ) : (
          <span>Tap or hover any day square to inspect chapters logged.</span>
        )}
      </div>

      <div ref={scrollContainerRef} className="mt-2 overflow-x-auto pb-2 lg:overflow-x-visible">
        <div className="inline-block min-w-max lg:block lg:w-full lg:min-w-0">
          {/* Month labels */}
          <div className="mb-1.5 flex items-end gap-1.5 text-[0.7rem] font-medium text-[var(--text-secondary)]">
            <span className="w-7 shrink-0" aria-hidden="true" />
            <div className="flex gap-[3px] lg:grid lg:flex-1 lg:grid-cols-[repeat(52,minmax(0,1fr))]">
              {weeks.map((_, wIdx) => {
                const label = monthLabels.find((m) => m.weekIndex === wIdx);
                return (
                  <div
                    key={wIdx}
                    className="w-[14px] shrink-0 overflow-visible whitespace-nowrap sm:w-[12px] lg:w-auto"
                  >
                    {label ? <span>{label.label}</span> : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-1.5">
            {/* Weekday axis */}
            <div className="flex w-7 shrink-0 flex-col justify-between py-0.5 text-[0.65rem] text-[var(--text-secondary)]">
              <span>Sun</span>
              <span>Tue</span>
              <span>Thu</span>
              <span>Sat</span>
            </div>

            {/* 52 week columns */}
            <div
              className="flex gap-[3px] lg:grid lg:flex-1 lg:grid-cols-[repeat(52,minmax(0,1fr))]"
              role="grid"
              aria-label="52-week Bible reading activity"
            >
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[3px] lg:min-w-0" role="row">
                  {week.map((day) => {
                    const count = day.isFuture ? 0 : dailyCounts[day.date] ?? 0;
                    const level = levelForCount(count);
                    const isSelected = selectedDay?.date === day.date;
                    return (
                      <button
                        key={day.date}
                        type="button"
                        disabled={day.isFuture}
                        onClick={() => setSelectedDay({ date: day.date, count })}
                        onMouseEnter={() => setHoveredDay({ date: day.date, count })}
                        onFocus={() => setHoveredDay({ date: day.date, count })}
                        onMouseLeave={() => setHoveredDay(null)}
                        aria-label={`${formatPlainDate(day.date)}: ${count} chapters read`}
                        className={`h-[14px] w-[14px] rounded-[2px] border transition-colors sm:h-[12px] sm:w-[12px] lg:aspect-square lg:h-auto lg:w-full ${
                          day.isFuture
                            ? 'cursor-default border-transparent opacity-25'
                            : isSelected
                              ? 'border-[var(--text-primary)]'
                              : 'border-transparent hover:border-[var(--text-primary)]'
                        }`}
                        style={{ backgroundColor: LEVEL_COLORS[level] }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Accessible semantic data table alternative */}
      <details className="mt-4 border-t border-[var(--border-subtle)] pt-3">
        <summary className="inline-flex min-h-9 cursor-pointer items-center text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          Monthly summary table
        </summary>
        {monthlySummary.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            No reading sessions logged yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-3 w-full max-w-md text-left text-xs">
              <caption className="visually-hidden">Recent monthly Bible reading totals</caption>
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                  <th scope="col" className="py-1.5 pr-4 font-medium">
                    Month
                  </th>
                  <th scope="col" className="py-1.5 pr-4 font-medium">
                    Active days
                  </th>
                  <th scope="col" className="py-1.5 font-medium">
                    Chapters logged
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlySummary.map(([month, stats]) => (
                  <tr key={month} className="border-b border-[var(--border-subtle)]/60">
                    <td className="py-1.5 pr-4 font-medium text-[var(--text-primary)]">{month}</td>
                    <td className="py-1.5 pr-4 tabular-nums">{stats.activeDays}</td>
                    <td className="py-1.5 tabular-nums">{stats.chapters}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </details>
    </section>
  );
};
