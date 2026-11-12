import { addDays, todayPlainDate } from '../lib/dates';
import type { ReadingLogEntry } from '../types/bible';

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Generates an inspiring demo reading journey relative to today's date
 * so first-time visitors can preview heatmaps, streaks, progress rings,
 * reflections, and illuminated seals in one click.
 */
export function createDemoReadingLogs(anchorDateIso = todayPlainDate()): ReadingLogEntry[] {
  const day = (offset: number) => addDays(anchorDateIso, offset);
  const atHour = (dateIso: string, hour: number) =>
    `${dateIso}T${String(hour).padStart(2, '0')}:15:00.000Z`;

  const entries: Omit<ReadingLogEntry, 'id'>[] = [
    // Completed Genesis (50 ch) earlier in the year
    { bookId: 'genesis', chapters: range(1, 10), readDate: day(-58), loggedAt: atHour(day(-58), 7), note: 'Creation and the promise of Genesis 3:15.' },
    { bookId: 'genesis', chapters: range(11, 22), readDate: day(-55), loggedAt: atHour(day(-55), 7), note: 'The call of Abraham and the ram on Moriah.' },
    { bookId: 'genesis', chapters: range(23, 36), readDate: day(-51), loggedAt: atHour(day(-51), 8) },
    { bookId: 'genesis', chapters: range(37, 50), readDate: day(-47), loggedAt: atHour(day(-47), 7), note: 'Genesis 50:20 — what was meant for evil, God meant for good.' },

    // Completed Ruth (4 ch)
    { bookId: 'ruth', chapters: range(1, 4), readDate: day(-40), loggedAt: atHour(day(-40), 20), note: 'Where you go I will go; kinsman-redeemer grace.' },

    // Completed Mark (16 ch)
    { bookId: 'mark', chapters: range(1, 6), readDate: day(-34), loggedAt: atHour(day(-34), 7) },
    { bookId: 'mark', chapters: range(7, 12), readDate: day(-31), loggedAt: atHour(day(-31), 7) },
    { bookId: 'mark', chapters: range(13, 16), readDate: day(-28), loggedAt: atHour(day(-28), 7), note: 'The Son of Man came not to be served but to serve.' },

    // Completed John (21 ch)
    { bookId: 'john', chapters: range(1, 7), readDate: day(-24), loggedAt: atHour(day(-24), 6), note: 'In the beginning was the Word — full of grace and truth.' },
    { bookId: 'john', chapters: range(8, 14), readDate: day(-20), loggedAt: atHour(day(-20), 6) },
    { bookId: 'john', chapters: range(15, 21), readDate: day(-17), loggedAt: atHour(day(-17), 6), note: 'Abide in the vine; peaceful upper room discourse.' },

    // Active 12-day streak through today across Psalms, Romans, Philippians, Proverbs
    { bookId: 'psalms', chapters: range(1, 5), readDate: day(-11), loggedAt: atHour(day(-11), 6), note: 'Blessed is the one planted by streams of water.' },
    { bookId: 'psalms', chapters: [23, 27, 34, 42, 46], readDate: day(-10), loggedAt: atHour(day(-10), 6), note: 'Be still and know that I am God.' },
    { bookId: 'psalms', chapters: [51, 63, 84, 90, 91], readDate: day(-9), loggedAt: atHour(day(-9), 7) },
    { bookId: 'psalms', chapters: [103, 119, 121, 139], readDate: day(-8), loggedAt: atHour(day(-8), 21), note: 'Psalm 119 — delighting in every stanza of God’s word.' },
    { bookId: 'philippians', chapters: [1, 2, 3, 4], readDate: day(-7), loggedAt: atHour(day(-7), 8), note: 'Rejoice in the Lord always; peace beyond understanding.' },
    { bookId: 'romans', chapters: [1, 2, 3], readDate: day(-6), loggedAt: atHour(day(-6), 7) },
    { bookId: 'romans', chapters: [4, 5, 6], readDate: day(-5), loggedAt: atHour(day(-5), 7), note: 'Justified by faith, we have peace with God.' },
    { bookId: 'romans', chapters: [7, 8], readDate: day(-4), loggedAt: atHour(day(-4), 7), note: 'Romans 8 — nothing can separate us from the love of God.' },
    { bookId: 'romans', chapters: [9, 10, 11], readDate: day(-3), loggedAt: atHour(day(-3), 7) },
    { bookId: 'romans', chapters: [12, 13], readDate: day(-2), loggedAt: atHour(day(-2), 8), note: 'Living sacrifices renewed in mind.' },
    { bookId: 'proverbs', chapters: [1, 2, 3, 4], readDate: day(-1), loggedAt: atHour(day(-1), 6), note: 'Trust in the Lord with all your heart.' },
    { bookId: 'romans', chapters: [14, 15, 16], readDate: day(0), loggedAt: atHour(day(0), 7), note: 'Finished Romans! May the God of hope fill you with all joy.' },
  ];

  return entries.map((entry, idx) => ({
    ...entry,
    id: `demo-log-${idx + 1}`,
  }));
}
