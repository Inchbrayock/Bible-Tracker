import { describe, expect, it } from 'vitest';
import { addDays, buildHeatmapCalendar, diffCalendarDays, getDayOfWeek } from '../lib/dates';

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
    const { days, monthLabels } = buildHeatmapCalendar('2026-11-12', 52);
    expect(days).toHaveLength(52 * 7);
    expect(days.some((d) => d.date === '2026-11-12' && !d.isFuture)).toBe(true);
    expect(monthLabels.length).toBeGreaterThanOrEqual(11);
  });
});
