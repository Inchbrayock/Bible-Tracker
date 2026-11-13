import { BOOKS_BY_ID } from '../data/bibleCanon';
import { buildPlanDaysFromSections } from '../data/readingPlans';
import type {
  CustomPlanDefinition,
  CustomPlanSection,
  ReadingPlan,
} from '../types/bible';

export interface PlanAccentOption {
  value: string;
  label: string;
}

export const PLAN_ACCENT_OPTIONS: readonly PlanAccentOption[] = [
  { value: 'var(--color-accent)', label: 'Cobalt' },
  { value: 'var(--color-sage)', label: 'Sage' },
  { value: 'var(--color-lamp)', label: 'Amber' },
  { value: 'var(--div-gospels)', label: 'Azure' },
  { value: 'var(--div-wisdom)', label: 'Emerald' },
  { value: 'var(--div-pauline)', label: 'Indigo' },
  { value: 'var(--div-pentateuch)', label: 'Ochre' },
  { value: 'var(--div-major)', label: 'Sienna' },
] as const;

export const ALLOWED_PLAN_ACCENTS = new Set<string>([
  'var(--color-accent)',
  'var(--color-sage)',
  'var(--color-lamp)',
  'var(--div-pentateuch)',
  'var(--div-history)',
  'var(--div-wisdom)',
  'var(--div-major)',
  'var(--div-minor)',
  'var(--div-gospels)',
  'var(--div-pauline)',
  'var(--div-general)',
]);

export function sanitizePlanAccentColor(value: unknown): string {
  if (typeof value === 'string' && ALLOWED_PLAN_ACCENTS.has(value)) {
    return value;
  }
  return 'var(--color-accent)';
}

export function createCustomPlanId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28);
  const rand = Math.random().toString(36).slice(2, 10);
  const base = slug ? `custom-${slug}-${rand}` : `custom-${Date.now()}-${rand}`;
  return base.slice(0, 64);
}

/** Normalizes and deduplicates invalid sections while keeping user-defined order. */
export function sanitizeCustomPlanSections(sections: CustomPlanSection[]): CustomPlanSection[] {
  const result: CustomPlanSection[] = [];
  for (const s of sections) {
    if (!s || typeof s.bookId !== 'string') continue;
    const book = BOOKS_BY_ID[s.bookId];
    if (!book) continue;
    const rawStart =
      typeof s.startChapter === 'number' && Number.isFinite(s.startChapter)
        ? Math.floor(s.startChapter)
        : 1;
    const rawEnd =
      typeof s.endChapter === 'number' && Number.isFinite(s.endChapter)
        ? Math.floor(s.endChapter)
        : book.chapterCount;
    const start = Math.max(1, Math.min(book.chapterCount, Math.min(rawStart, rawEnd)));
    const end = Math.max(start, Math.min(book.chapterCount, Math.max(rawStart, rawEnd)));

    if (start === 1 && end === book.chapterCount) {
      result.push({ bookId: book.id });
    } else {
      result.push({ bookId: book.id, startChapter: start, endChapter: end });
    }
  }
  return result;
}

/** Encodes custom plan sections into a compact ASCII spec compatible with Firestore string limits. */
export function encodeCustomPlanSections(sections: CustomPlanSection[]): string {
  return sanitizeCustomPlanSections(sections)
    .map((s) => {
      const book = BOOKS_BY_ID[s.bookId]!;
      const start = s.startChapter ?? 1;
      const end = s.endChapter ?? book.chapterCount;
      if (start === 1 && end === book.chapterCount) {
        return book.id;
      }
      if (start === end) {
        return `${book.id}:${start}`;
      }
      return `${book.id}:${start}-${end}`;
    })
    .join(',');
}

/** Decodes an encoded sections spec (`genesis,exodus:1-20`) into structured sections. */
export function decodeCustomPlanSections(spec: string): CustomPlanSection[] {
  if (typeof spec !== 'string' || !spec.trim()) return [];
  const rawTokens = spec
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const sections: CustomPlanSection[] = [];
  for (const token of rawTokens) {
    const [bookId, rangePart] = token.split(':');
    const book = BOOKS_BY_ID[bookId];
    if (!book) continue;
    if (!rangePart) {
      sections.push({ bookId: book.id });
      continue;
    }
    const [rawA, rawB] = rangePart.split('-').map((n) => Number.parseInt(n, 10));
    if (!Number.isInteger(rawA) || rawA < 1) {
      sections.push({ bookId: book.id });
      continue;
    }
    const endNum = Number.isInteger(rawB) && rawB >= 1 ? rawB : rawA;
    const start = Math.max(1, Math.min(book.chapterCount, Math.min(rawA, endNum)));
    const end = Math.max(start, Math.min(book.chapterCount, Math.max(rawA, endNum)));
    if (start === 1 && end === book.chapterCount) {
      sections.push({ bookId: book.id });
    } else {
      sections.push({ bookId: book.id, startChapter: start, endChapter: end });
    }
  }
  return sections;
}

/** Counts total distinct chapters covered across custom plan sections. */
export function computeSectionsChapterCount(sections: CustomPlanSection[]): number {
  const seen = new Set<string>();
  for (const s of sections) {
    const book = BOOKS_BY_ID[s.bookId];
    if (!book) continue;
    const rawStart = s.startChapter ?? 1;
    const rawEnd = s.endChapter ?? book.chapterCount;
    const start = Math.max(1, Math.min(book.chapterCount, Math.min(rawStart, rawEnd)));
    const end = Math.max(start, Math.min(book.chapterCount, Math.max(rawStart, rawEnd)));
    for (let ch = start; ch <= end; ch++) {
      seen.add(`${book.id}:${ch}`);
    }
  }
  return seen.size;
}

/** Validates and normalizes an untrusted custom plan object from storage/backup. */
export function sanitizeCustomPlanDefinition(raw: unknown): CustomPlanDefinition | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<CustomPlanDefinition> & { sectionsSpec?: unknown };

  if (typeof candidate.id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(candidate.id)) {
    return null;
  }

  const title = typeof candidate.title === 'string' ? candidate.title.trim().slice(0, 80) : '';
  if (!title) return null;

  const description =
    typeof candidate.description === 'string' ? candidate.description.trim().slice(0, 280) : '';

  let sections: CustomPlanSection[] = [];
  if (Array.isArray(candidate.sections)) {
    sections = sanitizeCustomPlanSections(candidate.sections);
  } else if (typeof candidate.sectionsSpec === 'string') {
    sections = decodeCustomPlanSections(candidate.sectionsSpec);
  }
  if (sections.length === 0) return null;

  const totalChapters = computeSectionsChapterCount(sections);
  if (totalChapters === 0) return null;

  const rawDuration =
    typeof candidate.durationDays === 'number' && Number.isFinite(candidate.durationDays)
      ? Math.round(candidate.durationDays)
      : totalChapters;
  const durationDays = Math.max(1, Math.min(totalChapters, rawDuration));

  const nowIso = new Date().toISOString();
  const createdAt =
    typeof candidate.createdAt === 'string' && candidate.createdAt.length >= 10
      ? candidate.createdAt.slice(0, 40)
      : nowIso;
  const updatedAt =
    typeof candidate.updatedAt === 'string' && candidate.updatedAt.length >= 10
      ? candidate.updatedAt.slice(0, 40)
      : createdAt;

  return {
    id: candidate.id,
    title,
    description,
    sections,
    durationDays,
    accentColor: sanitizePlanAccentColor(candidate.accentColor),
    createdAt,
    updatedAt,
  };
}

/** Generates a full `ReadingPlan` from a saved `CustomPlanDefinition`. */
export function materializeCustomPlan(def: CustomPlanDefinition): ReadingPlan {
  const days = buildPlanDaysFromSections(def.sections, def.durationDays);
  const actualDuration = days.length;
  const totalChapters = computeSectionsChapterCount(def.sections);
  const avg = actualDuration > 0 ? totalChapters / actualDuration : totalChapters;
  const avgLabel =
    Math.abs(avg - Math.round(avg)) < 0.05 ? String(Math.round(avg)) : avg.toFixed(1);

  const uniqueBookCount = new Set(def.sections.map((s) => s.bookId)).size;
  const fallbackDescription = `${totalChapters} chapters across ${uniqueBookCount} ${
    uniqueBookCount === 1 ? 'book' : 'books'
  }, arranged in ${actualDuration} ${actualDuration === 1 ? 'day' : 'days'}.`;

  return {
    id: def.id,
    title: def.title,
    subtitle: `${actualDuration} ${actualDuration === 1 ? 'day' : 'days'}, ~${avgLabel} chapters daily`,
    durationDays: actualDuration,
    accentColor: def.accentColor,
    description: def.description.trim() || fallbackDescription,
    days,
    category: 'custom',
    order: 'custom',
    isCustom: true,
    customDefinition: def,
  };
}

/** Extracts ordered unique book IDs/ranges from any built-in or custom plan to support "Customize copy". */
export function extractSectionsFromPlan(plan: ReadingPlan): CustomPlanSection[] {
  if (plan.customDefinition) {
    return plan.customDefinition.sections.map((s) => ({ ...s }));
  }

  const seenBooks = new Set<string>();
  const bookOrder: string[] = [];
  for (const day of plan.days) {
    for (const assignment of day.assignments) {
      if (!seenBooks.has(assignment.bookId) && BOOKS_BY_ID[assignment.bookId]) {
        seenBooks.add(assignment.bookId);
        bookOrder.push(assignment.bookId);
      }
    }
  }
  return bookOrder.map((bookId) => ({ bookId }));
}
