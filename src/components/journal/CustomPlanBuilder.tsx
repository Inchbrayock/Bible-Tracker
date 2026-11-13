import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { BIBLE_BOOKS, BOOKS_BY_ID, DIVISION_META_BY_ID } from '../../data/bibleCanon';
import { buildPlanDaysFromSections } from '../../data/readingPlans';
import {
  computeSectionsChapterCount,
  PLAN_ACCENT_OPTIONS,
  sanitizeCustomPlanSections,
} from '../../lib/customPlans';
import { SPRING_TACTILE, TACTILE_PILL_TAP, TACTILE_TAP } from '../../lib/motion';
import type { SaveCustomPlanInput } from '../../store/useBibleStore';
import type { CustomPlanSection, ReadingPlan } from '../../types/bible';

export interface CustomPlanDraft {
  id?: string;
  title: string;
  description: string;
  sections: CustomPlanSection[];
  durationDays: number;
  accentColor: string;
}

interface CustomPlanBuilderProps {
  initialDraft?: CustomPlanDraft;
  onSave: (
    input: SaveCustomPlanInput,
    options: { activate: boolean }
  ) => Promise<ReadingPlan>;
  onCancel: () => void;
}

interface PassagePreset {
  id: string;
  label: string;
  bookIds: string[];
}

const PASSAGE_PRESETS: PassagePreset[] = [
  {
    id: 'gospels-acts',
    label: 'Gospels & Acts',
    bookIds: BIBLE_BOOKS.filter((b) => b.division === 'gospels-acts').map((b) => b.id),
  },
  {
    id: 'pauline',
    label: 'Pauline Letters',
    bookIds: BIBLE_BOOKS.filter((b) => b.division === 'pauline').map((b) => b.id),
  },
  {
    id: 'wisdom',
    label: 'Wisdom & Psalms',
    bookIds: BIBLE_BOOKS.filter((b) => b.division === 'wisdom').map((b) => b.id),
  },
  {
    id: 'pentateuch',
    label: 'Pentateuch',
    bookIds: BIBLE_BOOKS.filter((b) => b.division === 'pentateuch').map((b) => b.id),
  },
  {
    id: 'history',
    label: 'Historical Books',
    bookIds: BIBLE_BOOKS.filter((b) => b.division === 'history').map((b) => b.id),
  },
  {
    id: 'prophets',
    label: 'All Prophets',
    bookIds: BIBLE_BOOKS.filter(
      (b) => b.division === 'major-prophets' || b.division === 'minor-prophets'
    ).map((b) => b.id),
  },
  {
    id: 'nt',
    label: 'New Testament',
    bookIds: BIBLE_BOOKS.filter((b) => b.testament === 'NT').map((b) => b.id),
  },
  {
    id: 'ot',
    label: 'Old Testament',
    bookIds: BIBLE_BOOKS.filter((b) => b.testament === 'OT').map((b) => b.id),
  },
  {
    id: 'whole',
    label: 'Whole Bible',
    bookIds: BIBLE_BOOKS.map((b) => b.id),
  },
];

const QUICK_DAY_OPTIONS = [7, 14, 21, 30, 45, 60, 90, 180, 365] as const;

export const CustomPlanBuilder: React.FC<CustomPlanBuilderProps> = ({
  initialDraft,
  onSave,
  onCancel,
}) => {
  const isEditing = Boolean(initialDraft?.id);

  const [title, setTitle] = useState(initialDraft?.title ?? '');
  const [description, setDescription] = useState(initialDraft?.description ?? '');
  const [accentColor, setAccentColor] = useState(
    initialDraft?.accentColor ?? 'var(--color-accent)'
  );
  const [sections, setSections] = useState<CustomPlanSection[]>(() =>
    sanitizeCustomPlanSections(initialDraft?.sections ?? [])
  );

  const [paceMode, setPaceMode] = useState<'days' | 'chapters'>('days');
  const [targetDaysInput, setTargetDaysInput] = useState<number>(
    initialDraft?.durationDays ?? 30
  );
  const [chaptersPerDayInput, setChaptersPerDayInput] = useState<number>(3);

  const [bookSearch, setBookSearch] = useState('');
  const [testamentFilter, setTestamentFilter] = useState<'all' | 'OT' | 'NT'>('all');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedBookIdsSet = useMemo(
    () => new Set(sections.map((s) => s.bookId)),
    [sections]
  );

  const totalChapters = useMemo(
    () => computeSectionsChapterCount(sections),
    [sections]
  );

  const effectiveDurationDays = useMemo(() => {
    if (totalChapters === 0) return Math.max(1, targetDaysInput || 1);
    if (paceMode === 'chapters') {
      const chPerDay = Math.max(1, Math.min(50, Math.round(chaptersPerDayInput) || 1));
      return Math.max(1, Math.min(totalChapters, Math.ceil(totalChapters / chPerDay)));
    }
    return Math.max(1, Math.min(totalChapters, Math.round(targetDaysInput) || 1));
  }, [chaptersPerDayInput, paceMode, targetDaysInput, totalChapters]);

  const avgChaptersPerDay = useMemo(() => {
    if (totalChapters === 0 || effectiveDurationDays <= 0) return '0';
    const raw = totalChapters / effectiveDurationDays;
    return Math.abs(raw - Math.round(raw)) < 0.05
      ? String(Math.round(raw))
      : raw.toFixed(1);
  }, [effectiveDurationDays, totalChapters]);

  const previewDays = useMemo(() => {
    if (sections.length === 0 || totalChapters === 0) return [];
    return buildPlanDaysFromSections(sections, effectiveDurationDays);
  }, [effectiveDurationDays, sections, totalChapters]);

  const samplePreviewDays = useMemo(() => {
    if (previewDays.length === 0) return [];
    const indices = [0, 1, 2];
    if (previewDays.length > 4) {
      indices.push(previewDays.length - 1);
    }
    const seen = new Set<number>();
    return indices
      .filter((idx) => idx >= 0 && idx < previewDays.length)
      .filter((idx) => {
        if (seen.has(idx)) return false;
        seen.add(idx);
        return true;
      })
      .map((idx) => previewDays[idx]);
  }, [previewDays]);

  const filteredBooks = useMemo(() => {
    const q = bookSearch.trim().toLowerCase();
    return BIBLE_BOOKS.filter((book) => {
      if (testamentFilter !== 'all' && book.testament !== testamentFilter) return false;
      if (!q) return true;
      return (
        book.name.toLowerCase().includes(q) ||
        book.shortName.toLowerCase().includes(q) ||
        DIVISION_META_BY_ID[book.division].label.toLowerCase().includes(q)
      );
    });
  }, [bookSearch, testamentFilter]);

  const isInCanonicalOrder = useMemo(() => {
    for (let i = 1; i < sections.length; i++) {
      const prevOrder = BOOKS_BY_ID[sections[i - 1].bookId]?.order ?? 0;
      const curOrder = BOOKS_BY_ID[sections[i].bookId]?.order ?? 0;
      if (curOrder < prevOrder) return false;
    }
    return true;
  }, [sections]);

  const toggleBook = (bookId: string) => {
    setError(null);
    setSections((prev) => {
      if (prev.some((s) => s.bookId === bookId)) {
        return prev.filter((s) => s.bookId !== bookId);
      }
      return [...prev, { bookId }];
    });
  };

  const applyPreset = (preset: PassagePreset) => {
    setError(null);
    const nextSections = preset.bookIds.map((bookId) => ({ bookId }));
    setSections(nextSections);
    const chTotal = computeSectionsChapterCount(nextSections);
    if (chTotal > 0 && targetDaysInput > chTotal) {
      setTargetDaysInput(chTotal);
    }
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    setSections((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(targetIdx, 0, item);
      return next;
    });
  };

  const sortCanonical = () => {
    setSections((prev) =>
      [...prev].sort(
        (a, b) =>
          (BOOKS_BY_ID[a.bookId]?.order ?? 0) - (BOOKS_BY_ID[b.bookId]?.order ?? 0)
      )
    );
  };

  const updateSectionRange = (
    bookId: string,
    field: 'startChapter' | 'endChapter',
    rawValue: string
  ) => {
    const book = BOOKS_BY_ID[bookId];
    if (!book) return;
    const num = Number.parseInt(rawValue, 10);
    setSections((prev) =>
      prev.map((s) => {
        if (s.bookId !== bookId) return s;
        const curStart = s.startChapter ?? 1;
        const curEnd = s.endChapter ?? book.chapterCount;
        const clamped = Number.isInteger(num)
          ? Math.max(1, Math.min(book.chapterCount, num))
          : field === 'startChapter'
            ? 1
            : book.chapterCount;

        const nextStart = field === 'startChapter' ? clamped : Math.min(curStart, clamped);
        const nextEnd = field === 'endChapter' ? Math.max(nextStart, clamped) : Math.max(clamped, curEnd);

        if (nextStart === 1 && nextEnd === book.chapterCount) {
          return { bookId };
        }
        return { bookId, startChapter: nextStart, endChapter: nextEnd };
      })
    );
  };

  const handleSave = async (activate: boolean) => {
    setError(null);
    if (!title.trim()) {
      setError('Enter a name for your custom reading plan.');
      return;
    }
    if (sections.length === 0 || totalChapters === 0) {
      setError('Select at least one Bible book or chapter range before saving.');
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          id: initialDraft?.id,
          title: title.trim(),
          description: description.trim(),
          sections,
          durationDays: effectiveDurationDays,
          accentColor,
        },
        { activate }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save custom plan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="custom-plan-builder-heading" className="space-y-5">
      {/* Builder Header */}
      <div className="folio-sheet p-4 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="tactile-press inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Cancel</span>
            </button>
            <h2
              id="custom-plan-builder-heading"
              className="font-display text-2xl font-medium tracking-tight text-[var(--text-primary)]"
            >
              {isEditing ? 'Edit custom reading plan' : 'Create custom reading plan'}
            </h2>
          </div>

          <span className="text-xs font-medium tabular-nums text-[var(--text-secondary)]">
            {sections.length} {sections.length === 1 ? 'book' : 'books'}, {totalChapters}{' '}
            {totalChapters === 1 ? 'chapter' : 'chapters'} selected
          </span>
        </div>

        {/* Title, Description & Accent Swatch */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <label
              htmlFor="custom-plan-title"
              className="block text-xs font-medium text-[var(--text-secondary)]"
            >
              Plan title
            </label>
            <input
              id="custom-plan-title"
              type="text"
              maxLength={80}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Prison Letters in Two Weeks"
              className="folio-input mt-1 min-h-10 w-full px-3 py-1.5 text-base placeholder:text-[var(--text-secondary)] sm:text-sm"
            />
          </div>

          <div className="lg:col-span-4">
            <label
              htmlFor="custom-plan-description"
              className="block text-xs font-medium text-[var(--text-secondary)]"
            >
              Goal or description (optional)
            </label>
            <input
              id="custom-plan-description"
              type="text"
              maxLength={280}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional study focus or reminder…"
              className="folio-input mt-1 min-h-10 w-full px-3 py-1.5 text-base placeholder:text-[var(--text-secondary)] sm:text-sm"
            />
          </div>

          <div className="lg:col-span-3">
            <span className="block text-xs font-medium text-[var(--text-secondary)]">
              Ribbon color
            </span>
            <div
              role="radiogroup"
              aria-label="Choose plan ribbon color"
              className="mt-2 flex flex-wrap items-center gap-2"
            >
              {PLAN_ACCENT_OPTIONS.map((opt) => {
                const selected = accentColor === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={opt.label}
                    onClick={() => setAccentColor(opt.value)}
                    className={`relative h-6 w-6 rounded-full transition-transform ${
                      selected
                        ? 'scale-110 ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--bg-elevated)]'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: opt.value }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Builder Split Grid */}
      <div className="grid gap-5 lg:grid-cols-12 lg:items-start">
        {/* Left: Choose Books & Presets */}
        <div className="folio-sheet p-4 sm:p-6 lg:col-span-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h3 className="font-display text-lg font-medium text-[var(--text-primary)]">
                Choose books to include
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Pick a starting collection or tap individual books in the order you want to read them.
              </p>
            </div>
            {sections.length > 0 && (
              <button
                type="button"
                onClick={() => setSections([])}
                className="text-xs font-medium text-[var(--color-accent)] hover:underline"
              >
                Clear selection
              </button>
            )}
          </div>

          {/* Preset Collection Buttons */}
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {PASSAGE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className="tactile-press inline-flex min-h-8 items-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--text-primary)]"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Book Filter Controls */}
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-secondary)]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                placeholder="Search 66 books (e.g. Psalms, Romans)…"
                aria-label="Filter Bible books for custom plan"
                className="folio-input min-h-9 w-full py-1.5 pr-3 pl-8 text-base placeholder:text-[var(--text-secondary)] sm:text-xs"
              />
            </div>

            <div
              className="grid grid-cols-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 text-xs font-medium sm:inline-flex"
              role="group"
              aria-label="Filter books by testament"
            >
              {(['all', 'OT', 'NT'] as const).map((t) => {
                const active = testamentFilter === t;
                return (
                  <motion.button
                    key={t}
                    type="button"
                    whileTap={TACTILE_PILL_TAP}
                    onClick={() => setTestamentFilter(t)}
                    aria-pressed={active}
                    className={`relative min-h-8 rounded-[4px] px-3 py-1 transition-colors sm:min-h-0 ${
                      active
                        ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {t === 'all' ? 'All' : t}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* 66-Book Grid */}
          <div className="mt-3.5 grid max-h-[26rem] grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3">
            {filteredBooks.map((book) => {
              const selected = selectedBookIdsSet.has(book.id);
              const divMeta = DIVISION_META_BY_ID[book.division];
              return (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => toggleBook(book.id)}
                  aria-pressed={selected}
                  aria-label={`${book.name}, ${book.chapterCount} chapters`}
                  className={`tactile-press flex min-h-10 items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors ${
                    selected
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]/55 text-[var(--text-primary)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: divMeta.colorVar }}
                    />
                    <span className="truncate font-medium text-[var(--text-primary)]">
                      {book.name}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-[0.68rem]">
                    {selected ? (
                      <Check className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden="true" />
                    ) : (
                      `${book.chapterCount} ch`
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Ordered Sequence + Pace & Schedule Preview */}
        <div className="space-y-4 lg:col-span-5">
          {/* Selected Order & Chapter Range Editor */}
          <div className="folio-sheet p-4 sm:p-6">
            <div className="flex items-baseline justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
              <h3 className="font-display text-lg font-medium text-[var(--text-primary)]">
                Reading sequence
              </h3>
              {!isInCanonicalOrder && sections.length > 1 && (
                <button
                  type="button"
                  onClick={sortCanonical}
                  className="text-xs font-medium text-[var(--color-accent)] hover:underline"
                >
                  Sort canonically
                </button>
              )}
            </div>

            {sections.length === 0 ? (
              <div className="mt-3 rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5 text-center text-xs text-[var(--text-secondary)]">
                Select any books or collections on the left to shape your reading sequence.
              </div>
            ) : (
              <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                {sections.map((section, idx) => {
                  const book = BOOKS_BY_ID[section.bookId];
                  if (!book) return null;
                  const startVal = section.startChapter ?? 1;
                  const endVal = section.endChapter ?? book.chapterCount;
                  return (
                    <li
                      key={book.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-2 text-xs"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="w-4 shrink-0 text-[0.68rem] font-semibold tabular-nums text-[var(--text-secondary)]">
                          {idx + 1}.
                        </span>
                        <span className="truncate font-medium text-[var(--text-primary)]">
                          {book.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.68rem] text-[var(--text-secondary)]">Ch.</span>
                        <input
                          type="number"
                          min={1}
                          max={book.chapterCount}
                          value={startVal}
                          aria-label={`${book.name} start chapter`}
                          onChange={(e) =>
                            updateSectionRange(book.id, 'startChapter', e.target.value)
                          }
                          className="folio-input w-14 px-1.5 py-0.5 text-center text-xs tabular-nums"
                        />
                        <span className="text-[var(--text-secondary)]">to</span>
                        <input
                          type="number"
                          min={startVal}
                          max={book.chapterCount}
                          value={endVal}
                          aria-label={`${book.name} end chapter`}
                          onChange={(e) =>
                            updateSectionRange(book.id, 'endChapter', e.target.value)
                          }
                          className="folio-input w-14 px-1.5 py-0.5 text-center text-xs tabular-nums"
                        />

                        {sections.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={() => moveSection(idx, -1)}
                              disabled={idx === 0}
                              aria-label={`Move ${book.name} up`}
                              className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-35"
                            >
                              <ArrowUp className="h-3 w-3" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSection(idx, 1)}
                              disabled={idx === sections.length - 1}
                              aria-label={`Move ${book.name} down`}
                              className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-35"
                            >
                              <ArrowDown className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleBook(book.id)}
                          aria-label={`Remove ${book.name}`}
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--color-crimson)]"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Schedule Pace & Live Preview */}
          <div className="folio-sheet p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
              <h3 className="font-display text-lg font-medium text-[var(--text-primary)]">
                Duration & pace
              </h3>
              <div
                className="inline-flex rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 text-xs font-medium"
                role="group"
                aria-label="Choose schedule calculation mode"
              >
                <button
                  type="button"
                  onClick={() => setPaceMode('days')}
                  aria-pressed={paceMode === 'days'}
                  className={`rounded-[4px] px-2.5 py-1 transition-colors ${
                    paceMode === 'days'
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  By days
                </button>
                <button
                  type="button"
                  onClick={() => setPaceMode('chapters')}
                  aria-pressed={paceMode === 'chapters'}
                  className={`rounded-[4px] px-2.5 py-1 transition-colors ${
                    paceMode === 'chapters'
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  By ch/day
                </button>
              </div>
            </div>

            {paceMode === 'days' ? (
              <div className="mt-3.5 space-y-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_DAY_OPTIONS.filter(
                    (d) => totalChapters === 0 || d <= totalChapters
                  ).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTargetDaysInput(d)}
                      aria-pressed={effectiveDurationDays === d}
                      className={`tactile-press rounded border px-2 py-1 text-xs font-medium tabular-nums transition-colors ${
                        effectiveDurationDays === d
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>

                <div>
                  <label
                    htmlFor="custom-plan-duration"
                    className="block text-xs font-medium text-[var(--text-secondary)]"
                  >
                    Duration in days
                  </label>
                  <input
                    id="custom-plan-duration"
                    type="number"
                    min={1}
                    max={Math.max(1, totalChapters || 1189)}
                    value={targetDaysInput}
                    onChange={(e) => {
                      const val = Number.parseInt(e.target.value, 10);
                      setTargetDaysInput(Number.isInteger(val) ? val : 1);
                    }}
                    className="folio-input mt-1 min-h-10 w-full px-3 py-1.5 text-base tabular-nums sm:text-sm"
                  />
                  {totalChapters > 0 && targetDaysInput > totalChapters && (
                    <p className="mt-1 text-[0.72rem] text-[var(--text-secondary)]">
                      Capped at {totalChapters} {totalChapters === 1 ? 'day' : 'days'} (1 chapter/day minimum).
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-3.5 space-y-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setChaptersPerDayInput(c)}
                      aria-pressed={chaptersPerDayInput === c}
                      className={`tactile-press rounded border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors ${
                        chaptersPerDayInput === c
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      {c} ch/day
                    </button>
                  ))}
                </div>

                <div>
                  <label
                    htmlFor="custom-plan-ch-per-day"
                    className="block text-xs font-medium text-[var(--text-secondary)]"
                  >
                    Chapters per day
                  </label>
                  <input
                    id="custom-plan-ch-per-day"
                    type="number"
                    min={1}
                    max={50}
                    value={chaptersPerDayInput}
                    onChange={(e) => {
                      const val = Number.parseInt(e.target.value, 10);
                      setChaptersPerDayInput(Number.isInteger(val) ? val : 1);
                    }}
                    className="folio-input mt-1 min-h-10 w-full px-3 py-1.5 text-base tabular-nums sm:text-sm"
                  />
                </div>
              </div>
            )}

            {/* Schedule Summary & Sample Days */}
            <div className="mt-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-[var(--text-primary)] tabular-nums">
                <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden="true" />
                <span>
                  {totalChapters > 0
                    ? `${effectiveDurationDays} ${
                        effectiveDurationDays === 1 ? 'day' : 'days'
                      }, ~${avgChaptersPerDay} ${
                        avgChaptersPerDay === '1' ? 'chapter' : 'chapters'
                      } daily (${totalChapters} total)`
                    : 'Choose books to preview your daily schedule'}
                </span>
              </div>

              {samplePreviewDays.length > 0 && (
                <ul className="mt-2.5 space-y-1 border-t border-[var(--border-subtle)] pt-2 text-[var(--text-secondary)]">
                  {samplePreviewDays.map((day) => (
                    <li key={day.day} className="flex items-baseline justify-between gap-2">
                      <span className="shrink-0 font-medium tabular-nums text-[var(--text-primary)]">
                        Day {day.day}
                      </span>
                      <span className="truncate text-right">{day.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && (
              <p role="alert" className="mt-3 text-xs font-medium text-[var(--color-crimson)]">
                {error}
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave(false)}
                className="tactile-press inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface)] disabled:opacity-60"
              >
                Save plan
              </button>
              <motion.button
                type="button"
                disabled={saving}
                whileTap={TACTILE_TAP}
                transition={SPRING_TACTILE}
                onClick={() => void handleSave(true)}
                className="btn-primary inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isEditing ? 'Save & view plan' : 'Save & start plan'}</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
