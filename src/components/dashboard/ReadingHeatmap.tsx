import React, { useMemo, useState } from 'react';
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
  1: 'color-mix(in oklab, var(--color-sage) 34%, var(--bg-subtle))',
  2: 'color-mix(in oklab, var(--color-sage) 62%, var(--bg-subtle))',
  3: 'var(--color-sage)',
  4: 'var(--color-accent)',
};

export const ReadingHeatmap: React.FC = () => {
  const { logs, summary } = useBibleStore();
  const today = todayPlainDate();
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number } | null>(null);

  const dailyCounts = useMemo(() => buildDailyChapterCounts(logs), [logs]);
  const { days, monthLabels } = useMemo(() => buildHeatmapCalendar(today, 52), [today]);

  // Build week columns for SVG/CSS grid layout
  const weeks = useMemo(() => {
    const cols: typeof days[] = [];
    for (let w = 0; w < 52; w++) {
      cols.push(days.slice(w * 7, w * 7 + 7));
    }
    return cols;
  }, [days]);

  // Accessible monthly summary rows for semantic fallback table
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
    <section className="sanctuary-card p-5 sm:p-6" aria-labelledby="heatmap-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2
            id="heatmap-heading"
            className="font-display text-xl font-semibold text-[var(--text-primary)]"
          >
            52-Week Reading Rhythm
          </h2>
          <p className="text-sm text-[var(--text-secondary)] tabular-nums">
            {summary.activeDaysCount} active reading days · {summary.chaptersPerWeekAvg} ch/week
            average
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span>Less</span>
          {([0, 1, 2, 3, 4] as const).map((lvl) => (
            <span
              key={lvl}
              aria-hidden="true"
              className="inline-block h-3 w-3 rounded-[3px] border border-[var(--border-subtle)]"
              style={{ backgroundColor: LEVEL_COLORS[lvl] }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Live readout bar */}
      <div className="mt-3 min-h-5 text-xs font-medium text-[var(--text-secondary)] tabular-nums">
        {hoveredDay ? (
          <span>
            <strong className="text-[var(--text-primary)]">
              {formatPlainDate(hoveredDay.date)}
            </strong>
            : {hoveredDay.count} {hoveredDay.count === 1 ? 'chapter' : 'chapters'} read
          </span>
        ) : (
          <span>Hover or focus any day tile to inspect chapters logged.</span>
        )}
      </div>

      <div className="mt-2 overflow-x-auto pb-2">
        <div className="inline-block min-w-max">
          {/* Month labels */}
          <div className="mb-1.5 flex pl-8 text-[0.68rem] font-medium text-[var(--text-secondary)]">
            {weeks.map((_, wIdx) => {
              const label = monthLabels.find((m) => m.weekIndex === wIdx);
              return (
                <div key={wIdx} className="w-[15px] shrink-0 overflow-visible">
                  {label ? <span>{label.label}</span> : null}
                </div>
              );
            })}
          </div>

          <div className="flex gap-1.5">
            {/* Weekday axis */}
            <div className="flex flex-col justify-between py-0.5 text-[0.65rem] text-[var(--text-secondary)] pr-1">
              <span>Sun</span>
              <span>Tue</span>
              <span>Thu</span>
              <span>Sat</span>
            </div>

            {/* 52 week columns */}
            <div className="flex gap-[3px]" role="grid" aria-label="52-week Bible reading activity">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[3px]" role="row">
                  {week.map((day) => {
                    const count = day.isFuture ? 0 : dailyCounts[day.date] ?? 0;
                    const level = levelForCount(count);
                    return (
                      <button
                        key={day.date}
                        type="button"
                        disabled={day.isFuture}
                        onMouseEnter={() => setHoveredDay({ date: day.date, count })}
                        onFocus={() => setHoveredDay({ date: day.date, count })}
                        onMouseLeave={() => setHoveredDay(null)}
                        aria-label={`${formatPlainDate(day.date)}: ${count} chapters read`}
                        className={`h-[12px] w-[12px] rounded-[3px] border border-transparent transition-transform ${
                          day.isFuture
                            ? 'opacity-25 cursor-default'
                            : 'hover:scale-125 hover:border-[var(--text-primary)]'
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
      <details className="mt-3 border-t border-[var(--border-subtle)] pt-3">
        <summary className="cursor-pointer text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          Monthly Reading Summary Table
        </summary>
        {monthlySummary.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            No reading sessions logged yet.
          </p>
        ) : (
          <table className="mt-2 w-full max-w-md text-left text-xs">
            <caption className="visually-hidden">Recent monthly Bible reading totals</caption>
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                <th scope="col" className="py-1.5 pr-4 font-semibold">
                  Month
                </th>
                <th scope="col" className="py-1.5 pr-4 font-semibold">
                  Active Days
                </th>
                <th scope="col" className="py-1.5 font-semibold">
                  Chapters Logged
                </th>
              </tr>
            </thead>
            <tbody>
              {monthlySummary.map(([month, stats]) => (
                <tr key={month} className="border-b border-[var(--border-subtle)]/50">
                  <td className="py-1.5 pr-4 font-medium text-[var(--text-primary)]">{month}</td>
                  <td className="py-1.5 pr-4 tabular-nums">{stats.activeDays}</td>
                  <td className="py-1.5 tabular-nums">{stats.chapters}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </details>
    </section>
  );
};
