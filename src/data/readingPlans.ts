import { BIBLE_BOOKS } from './bibleCanon';
import type { CanonBook, ReadingPlan, ReadingPlanDay } from '../types/bible';

/**
 * Generates an evenly distributed sequential reading schedule across `books` over `durationDays`.
 */
function buildSequentialPlanDays(
  books: CanonBook[],
  durationDays: number,
  labelPrefix = 'Day'
): ReadingPlanDay[] {
  const flatChapters: { bookId: string; chapter: number; bookName: string }[] = [];
  for (const book of books) {
    for (let ch = 1; ch <= book.chapterCount; ch++) {
      flatChapters.push({ bookId: book.id, chapter: ch, bookName: book.name });
    }
  }

  const total = flatChapters.length;
  const basePerDay = Math.floor(total / durationDays);
  const extraDays = total % durationDays;

  const days: ReadingPlanDay[] = [];
  let cursor = 0;

  for (let day = 1; day <= durationDays; day++) {
    const count = basePerDay + (day <= extraDays ? 1 : 0);
    const slice = flatChapters.slice(cursor, cursor + count);
    cursor += count;

    const grouped: { bookId: string; chapters: number[]; bookName: string }[] = [];
    for (const item of slice) {
      const last = grouped[grouped.length - 1];
      if (last && last.bookId === item.bookId) {
        last.chapters.push(item.chapter);
      } else {
        grouped.push({
          bookId: item.bookId,
          chapters: [item.chapter],
          bookName: item.bookName,
        });
      }
    }

    const title =
      grouped.length === 0
        ? `${labelPrefix} ${day}`
        : grouped
            .map((g) =>
              g.chapters.length === 1
                ? `${g.bookName} ${g.chapters[0]}`
                : `${g.bookName} ${g.chapters[0]}–${g.chapters[g.chapters.length - 1]}`
            )
            .join(', ');

    days.push({
      day,
      title,
      assignments: grouped.map(({ bookId, chapters }) => ({ bookId, chapters })),
    });
  }

  return days;
}

function buildPsalmsProverbs31Days(): ReadingPlanDay[] {
  const days: ReadingPlanDay[] = [];
  let psalmCursor = 1;

  for (let day = 1; day <= 31; day++) {
    // 26 days of 5 Psalms + 5 days of 4 Psalms = 150 Psalms total, plus 1 Proverb each day
    const psalmCount = day <= 26 ? 5 : 4;
    const psalmChapters = Array.from({ length: psalmCount }, () => psalmCursor++);
    const firstP = psalmChapters[0];
    const lastP = psalmChapters[psalmChapters.length - 1];

    days.push({
      day,
      title: `Psalms ${firstP}–${lastP}, Proverbs ${day}`,
      assignments: [
        { bookId: 'psalms', chapters: psalmChapters },
        { bookId: 'proverbs', chapters: [day] },
      ],
    });
  }
  return days;
}

const GOSPELS_ACTS = BIBLE_BOOKS.filter((b) =>
  ['matthew', 'mark', 'luke', 'john', 'acts'].includes(b.id)
);
const NEW_TESTAMENT = BIBLE_BOOKS.filter((b) => b.testament === 'NT');

export const READING_PLANS: ReadingPlan[] = [
  {
    id: 'gospels-acts-45',
    title: 'Gospels & Acts Journey',
    subtitle: '45 days, 2–3 chapters daily',
    durationDays: 45,
    accentColor: 'var(--div-gospels)',
    description:
      'Walk through the life, teachings, death, resurrection, and early church across Matthew through Acts in six and a half weeks.',
    days: buildSequentialPlanDays(GOSPELS_ACTS, 45),
  },
  {
    id: 'psalms-proverbs-31',
    title: 'Psalms & Proverbs Month',
    subtitle: '31 days, prayer and wisdom',
    durationDays: 31,
    accentColor: 'var(--div-wisdom)',
    description:
      'Read one Proverb and four to five Psalms every day for a month, completing all 150 Psalms and 31 Proverbs.',
    days: buildPsalmsProverbs31Days(),
  },
  {
    id: 'nt-90',
    title: 'New Testament in 90 Days',
    subtitle: '90 days, ~3 chapters daily',
    durationDays: 90,
    accentColor: 'var(--div-pauline)',
    description:
      'Read all 27 books and 260 chapters of the New Testament in one quarter of a year.',
    days: buildSequentialPlanDays(NEW_TESTAMENT, 90),
  },
  {
    id: 'canonical-365',
    title: 'Canonical Bible in 1 Year',
    subtitle: '365 days, 3–4 chapters daily',
    durationDays: 365,
    accentColor: 'var(--color-accent)',
    description:
      'Journey steadily from Genesis 1 to Revelation 22 across all 1,189 chapters in 365 days.',
    days: buildSequentialPlanDays(BIBLE_BOOKS, 365),
  },
];
