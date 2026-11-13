import { BIBLE_BOOKS, BOOKS_BY_ID } from './bibleCanon';
import type {
  CanonBook,
  CustomPlanSection,
  ReadingPlan,
  ReadingPlanDay,
} from '../types/bible';

function formatDayAssignmentsTitle(
  grouped: { bookId: string; chapters: number[]; bookName: string }[],
  day: number,
  labelPrefix = 'Day'
): string {
  if (grouped.length === 0) return `${labelPrefix} ${day}`;

  return grouped
    .map((g) => {
      if (g.chapters.length === 1) {
        return `${g.bookName} ${g.chapters[0]}`;
      }
      // Collapse contiguous chapter runs neatly (e.g. Gen 1-3, Exod 1)
      const runs: string[] = [];
      let start = g.chapters[0];
      let prev = g.chapters[0];
      for (let i = 1; i < g.chapters.length; i++) {
        const cur = g.chapters[i];
        if (cur === prev + 1) {
          prev = cur;
        } else {
          runs.push(start === prev ? `${start}` : `${start}–${prev}`);
          start = cur;
          prev = cur;
        }
      }
      runs.push(start === prev ? `${start}` : `${start}–${prev}`);
      return `${g.bookName} ${runs.join(', ')}`;
    })
    .join(', ');
}

function distributeFlatChaptersIntoDays(
  flatChapters: { bookId: string; chapter: number; bookName: string }[],
  durationDays: number,
  labelPrefix = 'Day'
): ReadingPlanDay[] {
  const safeDays = Math.max(1, Math.min(1189, Math.round(durationDays)));
  const total = flatChapters.length;
  if (total === 0) {
    return Array.from({ length: safeDays }, (_, i) => ({
      day: i + 1,
      title: `${labelPrefix} ${i + 1}`,
      assignments: [],
    }));
  }

  const effectiveDays = Math.min(safeDays, total);
  const basePerDay = Math.floor(total / effectiveDays);
  const extraDays = total % effectiveDays;

  const days: ReadingPlanDay[] = [];
  let cursor = 0;

  for (let day = 1; day <= effectiveDays; day++) {
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

    days.push({
      day,
      title: formatDayAssignmentsTitle(grouped, day, labelPrefix),
      assignments: grouped.map(({ bookId, chapters }) => ({ bookId, chapters })),
    });
  }

  return days;
}

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
  return distributeFlatChaptersIntoDays(flatChapters, durationDays, labelPrefix);
}

/**
 * Expands ordered `CustomPlanSection` items (full books or chapter slices) into a multi-day schedule.
 */
export function buildPlanDaysFromSections(
  sections: CustomPlanSection[],
  durationDays: number,
  labelPrefix = 'Day'
): ReadingPlanDay[] {
  const flatChapters: { bookId: string; chapter: number; bookName: string }[] = [];
  const seenChapters = new Set<string>();

  for (const section of sections) {
    const book = BOOKS_BY_ID[section.bookId];
    if (!book) continue;
    const rawStart = section.startChapter ?? 1;
    const rawEnd = section.endChapter ?? book.chapterCount;
    const start = Math.max(1, Math.min(book.chapterCount, Math.min(rawStart, rawEnd)));
    const end = Math.max(start, Math.min(book.chapterCount, Math.max(rawStart, rawEnd)));

    for (let ch = start; ch <= end; ch++) {
      const key = `${book.id}:${ch}`;
      if (seenChapters.has(key)) continue;
      seenChapters.add(key);
      flatChapters.push({ bookId: book.id, chapter: ch, bookName: book.name });
    }
  }

  return distributeFlatChaptersIntoDays(flatChapters, durationDays, labelPrefix);
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

const CHRONOLOGICAL_SECTIONS: CustomPlanSection[] = [
  // Origins & Patriarchs
  { bookId: 'genesis', startChapter: 1, endChapter: 11 },
  { bookId: 'job', startChapter: 1, endChapter: 42 },
  { bookId: 'genesis', startChapter: 12, endChapter: 50 },
  // Exodus & Wilderness
  { bookId: 'exodus' },
  { bookId: 'leviticus' },
  { bookId: 'numbers' },
  { bookId: 'deuteronomy' },
  // Land & Judges
  { bookId: 'joshua' },
  { bookId: 'judges' },
  { bookId: 'ruth' },
  // United Kingdom & Wisdom
  { bookId: '1-samuel' },
  { bookId: '2-samuel' },
  { bookId: '1-chronicles' },
  { bookId: 'psalms', startChapter: 1, endChapter: 72 },
  { bookId: '1-kings', startChapter: 1, endChapter: 11 },
  { bookId: '2-chronicles', startChapter: 1, endChapter: 9 },
  { bookId: 'proverbs' },
  { bookId: 'song-of-solomon' },
  { bookId: 'ecclesiastes' },
  { bookId: 'psalms', startChapter: 73, endChapter: 119 },
  // Divided Kingdom & Prophets
  { bookId: '1-kings', startChapter: 12, endChapter: 22 },
  { bookId: '2-chronicles', startChapter: 10, endChapter: 28 },
  { bookId: 'obadiah' },
  { bookId: 'joel' },
  { bookId: 'jonah' },
  { bookId: 'amos' },
  { bookId: 'hosea' },
  { bookId: 'isaiah' },
  { bookId: 'micah' },
  { bookId: '2-kings' },
  { bookId: 'nahum' },
  { bookId: 'zephaniah' },
  { bookId: 'habakkuk' },
  { bookId: '2-chronicles', startChapter: 29, endChapter: 36 },
  { bookId: 'jeremiah' },
  { bookId: 'lamentations' },
  // Exile & Restoration
  { bookId: 'daniel' },
  { bookId: 'ezekiel' },
  { bookId: 'ezra', startChapter: 1, endChapter: 6 },
  { bookId: 'psalms', startChapter: 120, endChapter: 150 },
  { bookId: 'haggai' },
  { bookId: 'zechariah' },
  { bookId: 'esther' },
  { bookId: 'ezra', startChapter: 7, endChapter: 10 },
  { bookId: 'nehemiah' },
  { bookId: 'malachi' },
  // Life of Christ & Early Church
  { bookId: 'luke', startChapter: 1, endChapter: 1 },
  { bookId: 'john', startChapter: 1, endChapter: 1 },
  { bookId: 'matthew' },
  { bookId: 'mark' },
  { bookId: 'luke', startChapter: 2, endChapter: 24 },
  { bookId: 'john', startChapter: 2, endChapter: 21 },
  { bookId: 'acts', startChapter: 1, endChapter: 14 },
  { bookId: 'james' },
  { bookId: 'galatians' },
  { bookId: 'acts', startChapter: 15, endChapter: 18 },
  { bookId: '1-thessalonians' },
  { bookId: '2-thessalonians' },
  { bookId: '1-corinthians' },
  { bookId: '2-corinthians' },
  { bookId: 'romans' },
  { bookId: 'acts', startChapter: 19, endChapter: 28 },
  { bookId: 'ephesians' },
  { bookId: 'philippians' },
  { bookId: 'colossians' },
  { bookId: 'philemon' },
  { bookId: '1-timothy' },
  { bookId: 'titus' },
  { bookId: '1-peter' },
  { bookId: '2-peter' },
  { bookId: '2-timothy' },
  { bookId: 'hebrews' },
  { bookId: 'jude' },
  { bookId: '1-john' },
  { bookId: '2-john' },
  { bookId: '3-john' },
  { bookId: 'revelation' },
];

function buildOtNtPaired365Days(): ReadingPlanDay[] {
  const otBooks = BIBLE_BOOKS.filter((b) => b.testament === 'OT');
  const ntBooks = BIBLE_BOOKS.filter((b) => b.testament === 'NT');

  const otFlat: { bookId: string; chapter: number; bookName: string }[] = [];
  for (const book of otBooks) {
    for (let ch = 1; ch <= book.chapterCount; ch++) {
      otFlat.push({ bookId: book.id, chapter: ch, bookName: book.name });
    }
  }

  const ntFlat: { bookId: string; chapter: number; bookName: string }[] = [];
  for (const book of ntBooks) {
    for (let ch = 1; ch <= book.chapterCount; ch++) {
      ntFlat.push({ bookId: book.id, chapter: ch, bookName: book.name });
    }
  }

  const totalDays = 365;
  // Distribute 929 OT chapters evenly (either 2 or 3 per day)
  const otCounts: number[] = [];
  for (let i = 0; i < totalDays; i++) {
    otCounts.push(
      Math.floor(((i + 1) * otFlat.length) / totalDays) -
        Math.floor((i * otFlat.length) / totalDays)
    );
  }

  // Assign 1 NT chapter to all 2-OT days (166), plus evenly distribute remaining NT chapters (94) onto 3-OT days
  const threeOtIndices: number[] = [];
  const ntCounts = otCounts.map((c, idx) => {
    if (c === 2) return 1;
    threeOtIndices.push(idx);
    return 0;
  });

  const remainingNt = ntFlat.length - otCounts.filter((c) => c === 2).length;
  for (let k = 0; k < threeOtIndices.length; k++) {
    const giveExtra =
      Math.floor(((k + 1) * remainingNt) / threeOtIndices.length) -
      Math.floor((k * remainingNt) / threeOtIndices.length);
    if (giveExtra > 0) {
      ntCounts[threeOtIndices[k]] = 1;
    }
  }

  const days: ReadingPlanDay[] = [];
  let otCursor = 0;
  let ntCursor = 0;

  for (let dayIdx = 0; dayIdx < totalDays; dayIdx++) {
    const otSlice = otFlat.slice(otCursor, otCursor + otCounts[dayIdx]);
    otCursor += otSlice.length;
    const ntSlice = ntFlat.slice(ntCursor, ntCursor + ntCounts[dayIdx]);
    ntCursor += ntSlice.length;

    const grouped: { bookId: string; chapters: number[]; bookName: string }[] = [];
    for (const item of [...otSlice, ...ntSlice]) {
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

    days.push({
      day: dayIdx + 1,
      title: formatDayAssignmentsTitle(grouped, dayIdx + 1),
      assignments: grouped.map(({ bookId, chapters }) => ({ bookId, chapters })),
    });
  }

  return days;
}

const GOSPELS_ACTS = BIBLE_BOOKS.filter((b) =>
  ['matthew', 'mark', 'luke', 'john', 'acts'].includes(b.id)
);
const NEW_TESTAMENT = BIBLE_BOOKS.filter((b) => b.testament === 'NT');
const TORAH = BIBLE_BOOKS.filter((b) => b.division === 'pentateuch');
const KINGDOM_HISTORY = BIBLE_BOOKS.filter((b) => b.division === 'history');
const PROPHETS = BIBLE_BOOKS.filter(
  (b) => b.division === 'major-prophets' || b.division === 'minor-prophets'
);
const PAULINE_LETTERS = BIBLE_BOOKS.filter((b) => b.division === 'pauline');

export const CORE_DEFAULT_PLAN_IDS = [
  'gospels-acts-45',
  'psalms-proverbs-31',
  'nt-90',
  'canonical-365',
] as const;

export const READING_PLANS: ReadingPlan[] = [
  {
    id: 'gospels-acts-45',
    title: 'Gospels & Acts Journey',
    subtitle: '45 days, 2–3 chapters daily',
    durationDays: 45,
    accentColor: 'var(--div-gospels)',
    category: 'gospels',
    order: 'canonical',
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
    category: 'wisdom',
    order: 'paired',
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
    category: 'new-testament',
    order: 'canonical',
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
    category: 'whole-bible',
    order: 'canonical',
    description:
      'Journey steadily from Genesis 1 to Revelation 22 across all 1,189 chapters in 365 days.',
    days: buildSequentialPlanDays(BIBLE_BOOKS, 365),
  },
  {
    id: 'john-21',
    title: 'Gospel of John in 21 Days',
    subtitle: '21 days, 1 chapter daily',
    durationDays: 21,
    accentColor: 'var(--div-gospels)',
    category: 'gospels',
    order: 'canonical',
    description:
      'A gentle three-week walk through John’s Gospel, savoring one chapter a day from the Word made flesh to the risen Shepherd.',
    days: buildSequentialPlanDays([BOOKS_BY_ID['john']], 21),
  },
  {
    id: 'proverbs-31',
    title: 'Daily Proverbs',
    subtitle: '31 days, 1 chapter daily',
    durationDays: 31,
    accentColor: 'var(--div-wisdom)',
    category: 'wisdom',
    order: 'canonical',
    description:
      'Read one chapter of Proverbs each day for a full month, matching chapter and day to cultivate daily discernment.',
    days: buildSequentialPlanDays([BOOKS_BY_ID['proverbs']], 31),
  },
  {
    id: 'pauline-30',
    title: 'Paul’s Letters in 30 Days',
    subtitle: '30 days, ~3 chapters daily',
    durationDays: 30,
    accentColor: 'var(--div-pauline)',
    category: 'epistles',
    order: 'canonical',
    description:
      'Cover all thirteen Pauline Epistles from Romans through Philemon across one focused month of study.',
    days: buildSequentialPlanDays(PAULINE_LETTERS, 30),
  },
  {
    id: 'torah-50',
    title: 'Torah & Covenant Foundations',
    subtitle: '50 days, 3–4 chapters daily',
    durationDays: 50,
    accentColor: 'var(--div-pentateuch)',
    category: 'old-testament',
    order: 'canonical',
    description:
      'Explore Genesis through Deuteronomy in seven weeks—tracing creation, patriarchs, Exodus, holiness, and covenant renewal.',
    days: buildSequentialPlanDays(TORAH, 50),
  },
  {
    id: 'kingdom-history-60',
    title: 'Israel’s Kingdom & Exile',
    subtitle: '60 days, ~4 chapters daily',
    durationDays: 60,
    accentColor: 'var(--div-history)',
    category: 'old-testament',
    order: 'canonical',
    description:
      'Trace Israel’s story from Joshua and the Judges through David, Solomon, the divided monarchy, exile, and return in Ezra–Esther.',
    days: buildSequentialPlanDays(KINGDOM_HISTORY, 60),
  },
  {
    id: 'prophets-90',
    title: 'Voice of the Prophets',
    subtitle: '90 days, ~2.8 chapters daily',
    durationDays: 90,
    accentColor: 'var(--div-major)',
    category: 'prophets',
    order: 'canonical',
    description:
      'Read all 17 prophetic books from Isaiah through Malachi in three months—hearing warnings, grief, and promises of renewal.',
    days: buildSequentialPlanDays(PROPHETS, 90),
  },
  {
    id: 'chronological-365',
    title: 'Chronological Bible in 1 Year',
    subtitle: '365 days, historical sequence',
    durationDays: 365,
    accentColor: 'var(--color-sage)',
    category: 'whole-bible',
    order: 'chronological',
    description:
      'Read all 66 books as events unfolded—placing Job with the patriarchs, Psalms with David, and the Prophets alongside Kings and Chronicles.',
    days: buildPlanDaysFromSections(CHRONOLOGICAL_SECTIONS, 365),
  },
  {
    id: 'ot-nt-paired-365',
    title: 'Old & New Testament Together',
    subtitle: '365 days, paired daily readings',
    durationDays: 365,
    accentColor: 'var(--color-lamp)',
    category: 'whole-bible',
    order: 'paired',
    description:
      'Pair Old Testament history, poetry, and prophecy with New Testament readings across a balanced 3–4 chapter daily rhythm all year.',
    days: buildOtNtPaired365Days(),
  },
];
