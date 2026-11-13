import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import {
  buildHeatmapCalendar,
  buildYearHeatmapCalendar,
  formatPlainDate,
  parsePlainDate,
  todayPlainDate,
} from '../../lib/dates';
import { FOLIO_EASE, SPRING_TACTILE, TACTILE_PILL_TAP } from '../../lib/motion';
import { buildDailyChapterCounts } from '../../lib/progress';
import { useBibleStore } from '../../store/useBibleStore';

type YearFilter = 'rolling' | number;

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
  const currentYear = parsePlainDate(today).year;
  const [yearFilter, setYearFilter] = useState<YearFilter>('rolling');
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number } | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ date: string; count: number } | null>(null);
  const [showMonthlyTable, setShowMonthlyTable] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    for (const log of logs) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(log.readDate)) {
        const yr = Number(log.readDate.slice(0, 4));
        if (Number.isInteger(yr) && yr >= 1900 && yr <= 9999) {
          years.add(yr);
        }
      }
    }
    return [...years].sort((a, b) => b - a);
  }, [currentYear, logs]);

  const activeFilter: YearFilter =
    typeof yearFilter === 'number' && !availableYears.includes(yearFilter)
      ? 'rolling'
      : yearFilter;

  const inspectedDay = hoveredDay ?? selectedDay;

  const dailyCounts = useMemo(() => buildDailyChapterCounts(logs), [logs]);
  const { days, monthLabels, weekCount } = useMemo(
    () =>
      activeFilter === 'rolling'
        ? buildHeatmapCalendar(today, 52)
        : buildYearHeatmapCalendar(activeFilter, today),
    [activeFilter, today]
  );

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (activeFilter === 'rolling') {
      el.scrollLeft = el.scrollWidth;
    } else if (activeFilter === currentYear) {
      const todayIdx = days.findIndex((d) => d.date === today);
      if (todayIdx >= 0) {
        const weekRatio = Math.floor(todayIdx / 7) / Math.max(1, weekCount - 1);
        el.scrollLeft = Math.max(0, weekRatio * el.scrollWidth - el.clientWidth / 2);
      } else {
        el.scrollLeft = 0;
      }
    } else {
      el.scrollLeft = 0;
    }
  }, [activeFilter, currentYear, days, today, weekCount]);

  const weeks = useMemo(() => {
    const cols: typeof days[] = [];
    for (let w = 0; w < weekCount; w++) {
      cols.push(days.slice(w * 7, w * 7 + 7));
    }
    return cols;
  }, [days, weekCount]);

  const rangeStats = useMemo(() => {
    let activeDays = 0;
    let chapters = 0;
    let elapsedDays = 0;
    let firstInRangeDate: string | null = null;
    let lastInRangeDate: string | null = null;

    for (const day of days) {
      if (day.isOutsideRange || day.isFuture) continue;
      elapsedDays += 1;
      if (firstInRangeDate === null) firstInRangeDate = day.date;
      lastInRangeDate = day.date;
      const count = dailyCounts[day.date] ?? 0;
      if (count > 0) {
        activeDays += 1;
        chapters += count;
      }
    }

    const chaptersPerWeekAvg =
      elapsedDays > 0 ? Number(((chapters / elapsedDays) * 7).toFixed(1)) : 0;

    return {
      activeDays,
      chapters,
      chaptersPerWeekAvg,
      firstInRangeDate,
      lastInRangeDate,
    };
  }, [dailyCounts, days]);

  const monthlySummary = useMemo(() => {
    const { firstInRangeDate, lastInRangeDate } = rangeStats;
    if (!firstInRangeDate || !lastInRangeDate) return [];

    const map = new Map<string, { chapters: number; activeDays: number }>();
    for (const [date, count] of Object.entries(dailyCounts)) {
      if (count <= 0) continue;
      if (date < firstInRangeDate || date > lastInRangeDate) continue;
      const monthKey = date.slice(0, 7);
      const prev = map.get(monthKey) ?? { chapters: 0, activeDays: 0 };
      map.set(monthKey, {
        chapters: prev.chapters + count,
        activeDays: prev.activeDays + 1,
      });
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [dailyCounts, rangeStats]);

  const handleSelectFilter = (next: YearFilter) => {
    setYearFilter(next);
    setHoveredDay(null);
    setSelectedDay(null);
  };

  const filterOptions: { id: YearFilter; label: string }[] = [
    { id: 'rolling', label: 'Last 52 weeks' },
    ...availableYears.map((yr) => ({ id: yr as YearFilter, label: String(yr) })),
  ];

  const weekGridStyle = { '--heatmap-weeks': weekCount } as React.CSSProperties;

  return (
    <section className="folio-sheet p-4 sm:p-7" aria-labelledby="heatmap-heading">
      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h2
            id="heatmap-heading"
            className="font-display text-2xl font-medium text-[var(--text-primary)]"
          >
            52-Week Reading Cadence
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)] tabular-nums">
            {activeFilter === 'rolling'
              ? `${rangeStats.activeDays} active reading ${rangeStats.activeDays === 1 ? 'day' : 'days'} (${rangeStats.chapters} ${rangeStats.chapters === 1 ? 'chapter' : 'chapters'}), averaging ${summary.chaptersPerWeekAvg} chapters per week`
              : `In ${activeFilter}: ${rangeStats.activeDays} active reading ${rangeStats.activeDays === 1 ? 'day' : 'days'} (${rangeStats.chapters} ${rangeStats.chapters === 1 ? 'chapter' : 'chapters'}), averaging ${rangeStats.chaptersPerWeekAvg} chapters per week`}
          </p>
        </div>

        <div className="flex flex-col items-start gap-2.5 sm:items-end">
          <div
            role="group"
            aria-label="Filter reading cadence by year"
            className="inline-flex max-w-full flex-nowrap items-center overflow-x-auto rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 text-xs font-medium"
          >
            {filterOptions.map((opt) => {
              const isActive = activeFilter === opt.id;
              return (
                <motion.button
                  key={String(opt.id)}
                  type="button"
                  whileTap={TACTILE_PILL_TAP}
                  onClick={() => handleSelectFilter(opt.id)}
                  aria-pressed={isActive}
                  className={`relative min-h-9 shrink-0 whitespace-nowrap rounded-[4px] px-2.5 py-1.5 transition-colors sm:min-h-0 sm:px-3 ${
                    isActive
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="heatmap-year-pill"
                      transition={SPRING_TACTILE}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-[4px] bg-[var(--bg-elevated)] shadow-2xs"
                    />
                  )}
                  <span className="relative z-10 tabular-nums">{opt.label}</span>
                </motion.button>
              );
            })}
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
      </div>

      {/* Live readout bar */}
      <div className="mt-4 min-h-5 text-xs font-medium text-[var(--text-secondary)] tabular-nums">
        {inspectedDay ? (
          <motion.span
            key={inspectedDay.date}
            initial={{ opacity: 0.4, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12, ease: FOLIO_EASE }}
            className="inline-block"
          >
            <strong className="font-semibold text-[var(--text-primary)]">
              {formatPlainDate(inspectedDay.date)}
            </strong>{' '}
            — {inspectedDay.count} {inspectedDay.count === 1 ? 'chapter' : 'chapters'} read
          </motion.span>
        ) : (
          <span className="inline-block">
            Tap or hover any day square to inspect chapters logged.
          </span>
        )}
      </div>

      <div ref={scrollContainerRef} className="mt-2 overflow-x-auto pb-2 lg:overflow-x-visible">
        <div className="inline-block min-w-max lg:block lg:w-full lg:min-w-0">
          {/* Month labels */}
          <div className="mb-1.5 flex items-end gap-1.5 text-[0.7rem] font-medium text-[var(--text-secondary)]">
            <span className="w-7 shrink-0" aria-hidden="true" />
            <div
              className="heatmap-week-grid flex gap-[3px] lg:grid lg:flex-1"
              style={weekGridStyle}
            >
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

            {/* Week columns */}
            <div
              className="heatmap-week-grid flex gap-[3px] lg:grid lg:flex-1"
              style={weekGridStyle}
              role="grid"
              aria-label={
                activeFilter === 'rolling'
                  ? '52-week Bible reading activity'
                  : `${activeFilter} Bible reading activity`
              }
            >
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[3px] lg:min-w-0" role="row">
                  {week.map((day) => {
                    if (day.isOutsideRange) {
                      return (
                        <span
                          key={day.date}
                          aria-hidden="true"
                          className="h-[14px] w-[14px] sm:h-[12px] sm:w-[12px] lg:aspect-square lg:h-auto lg:w-full"
                        />
                      );
                    }
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
                        aria-label={`${formatPlainDate(day.date)}: ${count} ${count === 1 ? 'chapter' : 'chapters'} read`}
                        className={`h-[14px] w-[14px] rounded-[2px] border transition-[transform,border-color] duration-150 sm:h-[12px] sm:w-[12px] lg:aspect-square lg:h-auto lg:w-full ${
                          day.isFuture
                            ? 'cursor-default border-transparent opacity-25'
                            : isSelected
                              ? 'z-10 scale-125 border-[var(--text-primary)] ring-1 ring-[var(--text-primary)]/40'
                              : 'border-transparent hover:border-[var(--text-primary)] active:scale-90'
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
      <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
        <button
          type="button"
          aria-expanded={showMonthlyTable}
          onClick={() => setShowMonthlyTable((prev) => !prev)}
          className="tactile-press inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <motion.span
            aria-hidden="true"
            animate={{ rotate: showMonthlyTable ? 180 : 0 }}
            transition={SPRING_TACTILE}
            className="inline-flex"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </motion.span>
          <span>Monthly summary table</span>
        </button>

        <AnimatePresence initial={false}>
          {showMonthlyTable && (
            <motion.div
              key="monthly-table"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.24, ease: FOLIO_EASE }}
              className="overflow-hidden"
            >
              {monthlySummary.length === 0 ? (
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  {activeFilter === 'rolling'
                    ? 'No reading sessions logged in the last 52 weeks.'
                    : `No reading sessions logged in ${activeFilter}.`}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="mt-3 w-full max-w-md text-left text-xs">
                    <caption className="visually-hidden">
                      {activeFilter === 'rolling'
                        ? 'Monthly Bible reading totals for the last 52 weeks'
                        : `Monthly Bible reading totals for ${activeFilter}`}
                    </caption>
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
