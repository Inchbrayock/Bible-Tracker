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

/**
 * Generates an array of YYYY-MM-DD strings aligned to Sunday..Saturday columns
 * covering the last `weeks` weeks ending on `endDateIso`.
 */
export function buildHeatmapCalendar(endDateIso: string, weeks = 52): {
  days: { date: string; dayOfWeekIndex: number; weekIndex: number; isFuture: boolean }[];
  monthLabels: { weekIndex: number; label: string }[];
} {
  const end = parsePlainDate(endDateIso);
  // Convert ISO dayOfWeek (1=Mon..7=Sun) to Sunday-first index (0=Sun..6=Sat)
  const endSundayOffset = end.dayOfWeek === 7 ? 0 : end.dayOfWeek;
  const endWeekSaturday = end.add({ days: 6 - endSundayOffset });
  const totalDays = weeks * 7;
  const startSunday = endWeekSaturday.subtract({ days: totalDays - 1 });

  const days: { date: string; dayOfWeekIndex: number; weekIndex: number; isFuture: boolean }[] = [];
  const monthLabels: { weekIndex: number; label: string }[] = [];
  let lastMonth = -1;

  for (let i = 0; i < totalDays; i++) {
    const current = startSunday.add({ days: i });
    const weekIndex = Math.floor(i / 7);
    const dayOfWeekIndex = i % 7;
    const dateStr = current.toString();
    const isFuture = getTemporal().PlainDate.compare(current, end) > 0;

    if (dayOfWeekIndex === 0 && current.month !== lastMonth) {
      monthLabels.push({
        weekIndex,
        label: current.toLocaleString('en-US', { month: 'short' }),
      });
      lastMonth = current.month;
    }

    days.push({ date: dateStr, dayOfWeekIndex, weekIndex, isFuture });
  }

  return { days, monthLabels };
}
