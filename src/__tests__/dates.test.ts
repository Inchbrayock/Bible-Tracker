import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildHeatmapCalendar,
  buildYearHeatmapCalendar,
  diffCalendarDays,
  getDayOfWeek,
} from '../lib/dates';

describe('Temporal PlainDate helpers', () => {
  it('adds and diffs calendar days accurately across leap years and month ends', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-11-01', 11)).toBe('2026-11-12');
    expect(diffCalendarDays('2026-10-30', '2026-11-02')).toBe(3);
  });

  it('identifies Sunday as ISO day 7', () => {
    expect(getDayOfWeek('2026-11-08')).toBe(7);
  });

  it('builds a complete 52-week calendar grid ending in the current week', () => {
    const { days, monthLabels, weekCount } = buildHeatmapCalendar('2026-11-12', 52);
    expect(weekCount).toBe(52);
    expect(days).toHaveLength(52 * 7);
    expect(days.some((d) => d.date === '2026-11-12' && !d.isFuture && !d.isOutsideRange)).toBe(true);
    expect(monthLabels.length).toBeGreaterThanOrEqual(11);
  });

  it('builds a full calendar year grid covering leap days and marking out-of-year padding cells', () => {
    const leapYear = buildYearHeatmapCalendar(2024, '2026-11-12');
    expect(leapYear.weekCount).toBe(53);
    expect(leapYear.days).toHaveLength(53 * 7);
    const inYearDays = leapYear.days.filter((d) => !d.isOutsideRange);
    expect(inYearDays).toHaveLength(366);
    expect(inYearDays.some((d) => d.date === '2024-02-29' && !d.isFuture)).toBe(true);
    expect(leapYear.days.some((d) => d.date === '2023-12-31' && d.isOutsideRange)).toBe(true);
    expect(leapYear.days.some((d) => d.date === '2025-01-01' && d.isOutsideRange)).toBe(true);
    expect(leapYear.monthLabels.map((m) => m.label)).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]);

    const currentYear = buildYearHeatmapCalendar(2026, '2026-11-12');
    expect(currentYear.days.some((d) => d.date === '2026-11-12' && !d.isFuture && !d.isOutsideRange)).toBe(true);
    expect(currentYear.days.some((d) => d.date === '2026-11-13' && d.isFuture && !d.isOutsideRange)).toBe(true);

    const fiftyFourWeekYear = buildYearHeatmapCalendar(2028, '2028-05-01');
    expect(fiftyFourWeekYear.weekCount).toBe(54);
    expect(fiftyFourWeekYear.days).toHaveLength(54 * 7);
    expect(fiftyFourWeekYear.days.filter((d) => !d.isOutsideRange)).toHaveLength(366);
  });
});
