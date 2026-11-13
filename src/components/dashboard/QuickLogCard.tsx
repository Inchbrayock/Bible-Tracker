import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookMarked, Check, Plus } from 'lucide-react';
import { BIBLE_BOOKS, BOOKS_BY_ID } from '../../data/bibleCanon';
import { todayPlainDate } from '../../lib/dates';
import { FOLIO_EASE, SPRING_SEAL, SPRING_TACTILE, TACTILE_TAP } from '../../lib/motion';
import { parseChapterInput } from '../../lib/progress';
import { useBibleStore } from '../../store/useBibleStore';

interface QuickLogCardProps {
  onOpenBook?: (bookId: string) => void;
}

export const QuickLogCard: React.FC<QuickLogCardProps> = ({ onOpenBook }) => {
  const { summary, logChapters } = useBibleStore();

  const suggestedBookId = useMemo(() => {
    if (summary.lastReadBookId) {
      const lastProgress = summary.bookProgressById[summary.lastReadBookId];
      if (lastProgress && lastProgress.nextUnreadChapter !== null) {
        return lastProgress.book.id;
      }
    }
    const inProgress = BIBLE_BOOKS.find((b) => {
      const p = summary.bookProgressById[b.id];
      return p && p.readChapters > 0 && !p.completed;
    });
    return inProgress?.id ?? 'john';
  }, [summary]);

  const [bookId, setBookId] = useState<string>(suggestedBookId);
  const manualBookSelectionRef = useRef(false);
  const [chaptersText, setChaptersText] = useState<string>('');

  useEffect(() => {
    if (!manualBookSelectionRef.current) {
      setBookId(suggestedBookId);
    }
  }, [suggestedBookId]);

  const [readDate, setReadDate] = useState<string>(() => todayPlainDate());
  const [note, setNote] = useState<string>('');
  const [loggedSource, setLoggedSource] = useState<'quick' | 'manual' | null>(null);
  const [quickStamp, setQuickStamp] = useState<{ id: number; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stampIdRef = useRef(0);

  const selectedBook = BOOKS_BY_ID[bookId] ?? BIBLE_BOOKS[0];
  const selectedProgress = summary.bookProgressById[selectedBook.id];
  const nextChapter = selectedProgress?.nextUnreadChapter ?? 1;

  const continueTarget = useMemo(() => {
    const bp = summary.bookProgressById[suggestedBookId];
    if (!bp || bp.nextUnreadChapter === null) {
      return { book: BOOKS_BY_ID['john'], chapter: 1 };
    }
    return { book: bp.book, chapter: bp.nextUnreadChapter };
  }, [suggestedBookId, summary.bookProgressById]);

  const triggerStamp = (label: string) => {
    const id = ++stampIdRef.current;
    setQuickStamp({ id, label });
    setTimeout(() => {
      setQuickStamp((prev) => (prev?.id === id ? null : prev));
    }, 1500);
  };

  const handleOneClickNext = async () => {
    await logChapters({
      bookId: continueTarget.book.id,
      chapters: [continueTarget.chapter],
      readDate: todayPlainDate(),
    });
    setLoggedSource('quick');
    triggerStamp(`+1 ch · ${continueTarget.book.shortName} ${continueTarget.chapter}`);
    setTimeout(() => setLoggedSource((prev) => (prev === 'quick' ? null : prev)), 2200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const expr = chaptersText.trim() || String(nextChapter);
    const parsed = parseChapterInput(expr, selectedBook.chapterCount);
    if (parsed.length === 0) {
      setError(`Enter chapter numbers between 1 and ${selectedBook.chapterCount} (for example, 1-3 or 5).`);
      return;
    }

    await logChapters({
      bookId: selectedBook.id,
      chapters: parsed,
      readDate: readDate || todayPlainDate(),
      note,
    });
    setChaptersText('');
    setNote('');
    setLoggedSource('manual');
    triggerStamp(`+${parsed.length} ch`);
    setTimeout(() => setLoggedSource((prev) => (prev === 'manual' ? null : prev)), 2600);
  };

  const otBooks = BIBLE_BOOKS.filter((b) => b.testament === 'OT');
  const ntBooks = BIBLE_BOOKS.filter((b) => b.testament === 'NT');

  return (
    <section
      className="folio-sheet relative flex h-full flex-col justify-between overflow-hidden p-4 sm:p-7"
      aria-labelledby="quick-log-heading"
    >
      {/* Brief luminous seal sweep when a reading is inscribed */}
      <AnimatePresence>
        {quickStamp ? (
          <motion.span
            key={quickStamp.id}
            aria-hidden="true"
            initial={{ x: '-110%', opacity: 0.7 }}
            animate={{ x: '140%', opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: FOLIO_EASE }}
            className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-[color-mix(in_oklab,var(--color-sage)_14%,transparent)] to-transparent"
          />
        ) : null}
      </AnimatePresence>

      <div>
        <div className="flex flex-col justify-between gap-3.5 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:flex-wrap sm:items-start sm:gap-4 sm:pb-5">
          <div>
            <h2
              id="quick-log-heading"
              className="font-display text-2xl font-medium text-[var(--text-primary)]"
            >
              Log a Reading
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Record today’s chapters or backdate an earlier session.
            </p>
          </div>

          <div className="relative w-full sm:w-auto">
            <AnimatePresence>
              {quickStamp ? (
                <motion.span
                  key={quickStamp.id}
                  aria-hidden="true"
                  initial={{ opacity: 0, y: 4, scale: 0.85 }}
                  animate={{ opacity: 1, y: -22, scale: 1 }}
                  exit={{ opacity: 0, y: -34, scale: 0.94 }}
                  transition={SPRING_SEAL}
                  className="pointer-events-none absolute right-2 top-0 z-10 rounded-full border border-[var(--color-sage)] bg-[var(--color-sage-soft)] px-2.5 py-0.5 text-[0.7rem] font-semibold text-[var(--color-sage)] shadow-xs tabular-nums"
                >
                  {quickStamp.label}
                </motion.span>
              ) : null}
            </AnimatePresence>

            <motion.button
              type="button"
              whileTap={TACTILE_TAP}
              transition={SPRING_TACTILE}
              onClick={() => void handleOneClickNext()}
              className="btn-primary inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-opacity hover:opacity-90 sm:min-h-10 sm:w-auto"
            >
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Quick Log: {continueTarget.book.shortName} {continueTarget.chapter}
              </span>
            </motion.button>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 grid grid-cols-2 gap-3.5 sm:mt-6 sm:grid-cols-12 sm:gap-4">
          <div className="col-span-2 sm:col-span-5">
            <label
              htmlFor="quick-book-select"
              className="block text-xs font-medium text-[var(--text-secondary)]"
            >
              Book
            </label>
            <select
              id="quick-book-select"
              value={bookId}
              onChange={(e) => {
                manualBookSelectionRef.current = true;
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

          <div className="col-span-1 sm:col-span-4">
            <label
              htmlFor="quick-chapters-input"
              className="block text-xs font-medium text-[var(--text-secondary)]"
            >
              Chapters
            </label>
            <input
              id="quick-chapters-input"
              type="text"
              value={chaptersText}
              onChange={(e) => {
                setChaptersText(e.target.value);
                setError(null);
              }}
              placeholder={`Next: ${nextChapter} (or 1-4)`}
              aria-describedby="quick-chapters-hint"
              className="folio-input mt-1.5 min-h-11 w-full px-3 py-2 text-base placeholder:text-[var(--text-secondary)] sm:min-h-10 sm:text-sm"
            />
            <p id="quick-chapters-hint" className="mt-1 text-xs text-[var(--text-secondary)]">
              Up to ch. {selectedBook.chapterCount}
            </p>
          </div>

          <div className="col-span-1 sm:col-span-3">
            <label
              htmlFor="quick-date-input"
              className="block text-xs font-medium text-[var(--text-secondary)]"
            >
              Date read
            </label>
            <input
              id="quick-date-input"
              type="date"
              value={readDate}
              max={todayPlainDate()}
              onChange={(e) => setReadDate(e.target.value)}
              className="folio-input mt-1.5 min-h-11 w-full px-2.5 py-2 text-base sm:min-h-10 sm:px-3 sm:text-sm"
            />
          </div>

          <div className="col-span-2 sm:col-span-8">
            <label
              htmlFor="quick-note-input"
              className="block text-xs font-medium text-[var(--text-secondary)]"
            >
              Reflection or key verse (optional)
            </label>
            <input
              id="quick-note-input"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What stood out in today’s passage?"
              className="folio-input mt-1.5 min-h-11 w-full px-3 py-2 text-base placeholder:text-[var(--text-secondary)] sm:min-h-10 sm:text-sm"
            />
          </div>

          <div className="col-span-2 flex items-end sm:col-span-4">
            <motion.button
              type="submit"
              whileTap={TACTILE_TAP}
              animate={{ scale: loggedSource === 'manual' ? 1.02 : 1 }}
              transition={SPRING_TACTILE}
              className="btn-sage inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 sm:min-h-10 sm:px-3"
            >
              {loggedSource === 'manual' ? (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <motion.path
                      d="M20 6 9 17l-5-5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.28, ease: FOLIO_EASE }}
                    />
                  </svg>
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Log Passage</span>
                </>
              )}
            </motion.button>
          </div>
        </form>

        {error ? (
          <p role="alert" className="mt-3 text-xs font-medium text-[var(--color-crimson)]">
            {error}
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3.5 text-xs text-[var(--text-secondary)] sm:mt-6 sm:pt-4">
        <span className="tabular-nums">
          {selectedBook.name}: {selectedProgress?.readChapters ?? 0} of {selectedBook.chapterCount}{' '}
          chapters read
        </span>
        {onOpenBook ? (
          <button
            type="button"
            onClick={() => onOpenBook(selectedBook.id)}
            className="tactile-press inline-flex min-h-9 items-center gap-1.5 font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
          >
            <BookMarked className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Open {selectedBook.name} chapter grid</span>
          </button>
        ) : null}
      </div>
    </section>
  );
};
