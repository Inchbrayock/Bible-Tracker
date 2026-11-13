import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Plus, X } from 'lucide-react';
import { BIBLE_BOOKS, BOOKS_BY_ID } from '../../data/bibleCanon';
import { todayPlainDate } from '../../lib/dates';
import { FOLIO_EASE, SPRING_TACTILE, TACTILE_TAP } from '../../lib/motion';
import { parseChapterInput } from '../../lib/progress';
import { useBibleStore } from '../../store/useBibleStore';

interface JournalComposerProps {
  onClose: () => void;
  onSaved?: () => void;
}

export const JournalComposer: React.FC<JournalComposerProps> = ({ onClose, onSaved }) => {
  const { summary, preferences, allPlans, logChapters } = useBibleStore();

  const defaultBookId = useMemo(() => {
    if (summary.lastReadBookId) {
      const last = summary.bookProgressById[summary.lastReadBookId];
      if (last && last.nextUnreadChapter !== null) {
        return last.book.id;
      }
    }
    const inProgress = BIBLE_BOOKS.find((b) => {
      const p = summary.bookProgressById[b.id];
      return p && p.readChapters > 0 && !p.completed;
    });
    return inProgress?.id ?? 'john';
  }, [summary]);

  const [bookId, setBookId] = useState<string>(defaultBookId);
  const [chaptersText, setChaptersText] = useState('');
  const [readDate, setReadDate] = useState(() => todayPlainDate());
  const [note, setNote] = useState('');
  const [planId, setPlanId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedBook = BOOKS_BY_ID[bookId] ?? BIBLE_BOOKS[0];
  const selectedProgress = summary.bookProgressById[selectedBook.id];
  const nextChapter = selectedProgress?.nextUnreadChapter ?? 1;

  const otBooks = useMemo(() => BIBLE_BOOKS.filter((b) => b.testament === 'OT'), []);
  const ntBooks = useMemo(() => BIBLE_BOOKS.filter((b) => b.testament === 'NT'), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const expr = chaptersText.trim() || String(nextChapter);
    const parsed = parseChapterInput(expr, selectedBook.chapterCount);
    if (parsed.length === 0) {
      setError(
        `Enter chapter numbers between 1 and ${selectedBook.chapterCount} (for example, 1-3 or 5).`
      );
      return;
    }

    setSaving(true);
    try {
      await logChapters({
        bookId: selectedBook.id,
        chapters: parsed,
        readDate: readDate || todayPlainDate(),
        note,
        planId: planId || undefined,
      });
      setChaptersText('');
      setNote('');
      setError(null);
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.section
      aria-labelledby="journal-composer-heading"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: FOLIO_EASE }}
      className="folio-sheet p-4 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3.5">
        <div>
          <h2
            id="journal-composer-heading"
            className="font-display text-xl font-medium text-[var(--text-primary)]"
          >
            Record a reading entry
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            {selectedBook.name}: {selectedBook.theme}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close entry composer"
          className="tactile-press inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
        <div className="grid gap-3.5 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <label
              htmlFor="journal-composer-book"
              className="block text-xs font-medium text-[var(--text-secondary)]"
            >
              Book
            </label>
            <select
              id="journal-composer-book"
              value={bookId}
              onChange={(e) => {
                setBookId(e.target.value);
                setError(null);
              }}
              className="folio-input mt-1.5 min-h-11 w-full px-3 py-2 text-base font-medium sm:min-h-10 sm:text-sm"
            >
              <optgroup label="Old Testament">
                {otBooks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.chapterCount} ch)
                  </option>
                ))}
              </optgroup>
              <optgroup label="New Testament">
                {ntBooks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.chapterCount} ch)
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="sm:col-span-4">
            <label
              htmlFor="journal-composer-chapters"
              className="block text-xs font-medium text-[var(--text-secondary)]"
            >
              Chapters
            </label>
            <input
              id="journal-composer-chapters"
              type="text"
              value={chaptersText}
              onChange={(e) => {
                setChaptersText(e.target.value);
                setError(null);
              }}
              placeholder={`Next: ${nextChapter} (or 1-4)`}
              aria-describedby="journal-composer-chapters-hint"
              className="folio-input mt-1.5 min-h-11 w-full px-3 py-2 text-base placeholder:text-[var(--text-secondary)] sm:min-h-10 sm:text-sm"
            />
            <p
              id="journal-composer-chapters-hint"
              className="mt-1 text-xs text-[var(--text-secondary)] tabular-nums"
            >
              1–{selectedBook.chapterCount} (leave blank for ch. {nextChapter})
            </p>
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="journal-composer-date"
              className="block text-xs font-medium text-[var(--text-secondary)]"
            >
              Date read
            </label>
            <input
              id="journal-composer-date"
              type="date"
              value={readDate}
              max={todayPlainDate()}
              onChange={(e) => setReadDate(e.target.value)}
              className="folio-input mt-1.5 min-h-11 w-full px-3 py-2 text-base sm:min-h-10 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="journal-composer-note"
            className="block text-xs font-medium text-[var(--text-secondary)]"
          >
            Reflection note (optional)
          </label>
          <textarea
            id="journal-composer-note"
            rows={3}
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write what stood out in this passage, a verse to carry, or a prayer…"
            className="folio-input mt-1.5 w-full resize-y px-3 py-2.5 font-display text-base leading-relaxed placeholder:font-sans placeholder:text-sm placeholder:text-[var(--text-secondary)] sm:text-[1.02rem]"
          />
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-[var(--border-subtle)] pt-3.5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" aria-hidden="true" />
            <label htmlFor="journal-composer-plan" className="sr-only">
              Associate with reading plan
            </label>
            <select
              id="journal-composer-plan"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="folio-input min-h-10 px-2.5 py-1.5 text-base sm:min-h-9 sm:text-xs"
            >
              <option value="">Freeform reading</option>
              {allPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  Plan: {plan.title}
                  {plan.isCustom ? ' (Custom)' : ''}
                  {preferences.activePlanId === plan.id ? ' (Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="tactile-press min-h-10 rounded-md border border-[var(--border-subtle)] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:min-h-9 sm:py-1.5"
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              disabled={saving}
              whileTap={TACTILE_TAP}
              transition={SPRING_TACTILE}
              className="btn-sage inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-60 sm:min-h-9 sm:py-1.5"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{saving ? 'Saving…' : 'Save entry'}</span>
            </motion.button>
          </div>
        </div>

        {error ? (
          <p role="alert" className="text-xs font-medium text-[var(--color-crimson)]">
            {error}
          </p>
        ) : null}
      </form>
    </motion.section>
  );
};
