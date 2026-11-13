import { Temporal as PolyfillTemporal } from 'temporal-polyfill';

/**
 * Resolve Temporal API (native when available, temporal-polyfill fallback).
 * Ensures location-agnostic calendar date arithmetic never suffers UTC/DST drift.
 */
export function getTemporal(): typeof PolyfillTemporal {
  const g = globalThis as typeof globalThis & { Temporal?: typeof PolyfillTemporal };
  return typeof g.Temporal !== 'undefined' ? g.Temporal : PolyfillTemporal;
}

export function todayPlainDate(): string {
  return getTemporal().Now.plainDateISO().toString();
}

export function parsePlainDate(isoDate: string) {
  return getTemporal().PlainDate.from(isoDate);
}

export function addDays(isoDate: string, days: number): string {
  return parsePlainDate(isoDate).add({ days }).toString();
}

export function comparePlainDates(a: string, b: string): number {
  const T = getTemporal();
  return T.PlainDate.compare(T.PlainDate.from(a), T.PlainDate.from(b));
}

export function diffCalendarDays(earlierIso: string, laterIso: string): number {
  const earlier = parsePlainDate(earlierIso);
  const later = parsePlainDate(laterIso);
  return earlier.until(later, { largestUnit: 'day' }).days;
}

export function getDayOfWeek(isoDate: string): number {
  // ISO weekday: 1 = Monday ... 7 = Sunday
  return parsePlainDate(isoDate).dayOfWeek;
}

export function getLocalHourFromIsoInstant(isoInstant: string): number {
  const T = getTemporal();
  try {
    const zdt = T.Instant.from(isoInstant).toZonedDateTimeISO(T.Now.timeZoneId());
    return zdt.hour;
  } catch {
    return new Date(isoInstant).getHours();
  }
}

export function formatPlainDate(
  isoDate: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  return parsePlainDate(isoDate).toLocaleString('en-US', options);
}

export function formatShortDate(isoDate: string): string {
  return parsePlainDate(isoDate).toLocaleString('en-US', { month: 'short', day: 'numeric' });
}

export interface HeatmapDay {
  date: string;
  dayOfWeekIndex: number;
  weekIndex: number;
  isFuture: boolean;
  isOutsideRange: boolean;
}

export interface HeatmapMonthLabel {
  weekIndex: number;
  label: string;
}

export interface HeatmapCalendarData {
  days: HeatmapDay[];
  monthLabels: HeatmapMonthLabel[];
  weekCount: number;
}

function buildHeatmapGrid(
  startSunday: PolyfillTemporal.PlainDate,
  weekCount: number,
  today: PolyfillTemporal.PlainDate,
  restrictYear?: number
): HeatmapCalendarData {
  const T = getTemporal();
  const totalDays = weekCount * 7;
  const days: HeatmapDay[] = [];
  const monthLabels: HeatmapMonthLabel[] = [];
  let lastMonth = -1;

  for (let i = 0; i < totalDays; i++) {
    const current = startSunday.add({ days: i });
    const weekIndex = Math.floor(i / 7);
    const dayOfWeekIndex = i % 7;
    const dateStr = current.toString();
    const isOutsideRange = restrictYear !== undefined && current.year !== restrictYear;
    const isFuture = T.PlainDate.compare(current, today) > 0;

    if (!isOutsideRange && dayOfWeekIndex === 0 && current.month !== lastMonth) {
      monthLabels.push({
        weekIndex,
        label: current.toLocaleString('en-US', { month: 'short' }),
      });
      lastMonth = current.month;
    }

    days.push({ date: dateStr, dayOfWeekIndex, weekIndex, isFuture, isOutsideRange });
  }

  return { days, monthLabels, weekCount };
}

/**
 * Generates an array of YYYY-MM-DD strings aligned to Sunday..Saturday columns
 * covering the last `weeks` weeks ending on `endDateIso`.
 */
export function buildHeatmapCalendar(endDateIso: string, weeks = 52): HeatmapCalendarData {
  const end = parsePlainDate(endDateIso);
  // Convert ISO dayOfWeek (1=Mon..7=Sun) to Sunday-first index (0=Sun..6=Sat)
  const endSundayOffset = end.dayOfWeek === 7 ? 0 : end.dayOfWeek;
  const endWeekSaturday = end.add({ days: 6 - endSundayOffset });
  const totalDays = weeks * 7;
  const startSunday = endWeekSaturday.subtract({ days: totalDays - 1 });

  return buildHeatmapGrid(startSunday, weeks, end);
}

/**
 * Generates an array of YYYY-MM-DD strings aligned to Sunday..Saturday columns
 * covering the full calendar `year`, marking padding days outside `year` via `isOutsideRange`.
 */
export function buildYearHeatmapCalendar(
  year: number,
  todayIso = todayPlainDate()
): HeatmapCalendarData {
  const T = getTemporal();
  const today = parsePlainDate(todayIso);
  const jan1 = T.PlainDate.from({ year, month: 1, day: 1 });
  const dec31 = T.PlainDate.from({ year, month: 12, day: 31 });

  const startOffset = jan1.dayOfWeek === 7 ? 0 : jan1.dayOfWeek;
  const startSunday = jan1.subtract({ days: startOffset });

  const endOffset = dec31.dayOfWeek === 7 ? 0 : dec31.dayOfWeek;
  const endSaturday = dec31.add({ days: 6 - endOffset });

  const totalDays = startSunday.until(endSaturday, { largestUnit: 'day' }).days + 1;
  const weekCount = Math.round(totalDays / 7);

  return buildHeatmapGrid(startSunday, weekCount, today, year);
}
