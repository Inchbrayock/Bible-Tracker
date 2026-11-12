import React, { useMemo, useState } from 'react';
import { BookMarked, Check, Plus } from 'lucide-react';
import { BIBLE_BOOKS, BOOKS_BY_ID } from '../../data/bibleCanon';
import { todayPlainDate } from '../../lib/dates';
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
  const [chaptersText, setChaptersText] = useState<string>('');
  const [readDate, setReadDate] = useState<string>(() => todayPlainDate());
  const [note, setNote] = useState<string>('');
  const [justLogged, setJustLogged] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleOneClickNext = async () => {
    await logChapters({
      bookId: continueTarget.book.id,
      chapters: [continueTarget.chapter],
      readDate: todayPlainDate(),
    });
    setJustLogged(`${continueTarget.book.name} ${continueTarget.chapter}`);
    setTimeout(() => setJustLogged(null), 2600);
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
    setJustLogged(`${selectedBook.name} ${expr}`);
    setTimeout(() => setJustLogged(null), 2600);
  };

  const otBooks = BIBLE_BOOKS.filter((b) => b.testament === 'OT');
  const ntBooks = BIBLE_BOOKS.filter((b) => b.testament === 'NT');

  return (
    <section className="folio-sheet p-5 sm:p-7" aria-labelledby="quick-log-heading">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
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

        <button
          type="button"
          onClick={() => void handleOneClickNext()}
          className="btn-primary inline-flex min-h-10 items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-opacity hover:opacity-90"
        >
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Quick Log: {continueTarget.book.shortName} {continueTarget.chapter}
          </span>
        </button>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 grid gap-4 sm:grid-cols-12">
        <div className="sm:col-span-5">
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
              setBookId(e.target.value);
              setError(null);
            }}
            className="folio-input mt-1.5 w-full px-3 py-2 text-sm font-medium"
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
            className="folio-input mt-1.5 w-full px-3 py-2 text-sm placeholder:text-[var(--text-secondary)]"
          />
          <p id="quick-chapters-hint" className="mt-1 text-xs text-[var(--text-secondary)]">
            Range or list up to ch. {selectedBook.chapterCount}
          </p>
        </div>

        <div className="sm:col-span-3">
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
            className="folio-input mt-1.5 w-full px-3 py-2 text-sm"
          />
        </div>

        <div className="sm:col-span-9">
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
            className="folio-input mt-1.5 w-full px-3 py-2 text-sm placeholder:text-[var(--text-secondary)]"
          />
        </div>

        <div className="flex items-end sm:col-span-3">
          <button
            type="submit"
            className="btn-sage inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          >
            {justLogged ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Log Passage</span>
              </>
            )}
          </button>
        </div>
      </form>

      {error ? (
        <p role="alert" className="mt-3 text-xs font-medium text-[var(--color-crimson)]">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-4 text-xs text-[var(--text-secondary)]">
        <span className="tabular-nums">
          {selectedBook.name}: {selectedProgress?.readChapters ?? 0} of {selectedBook.chapterCount}{' '}
          chapters read
        </span>
        {onOpenBook ? (
          <button
            type="button"
            onClick={() => onOpenBook(selectedBook.id)}
            className="inline-flex items-center gap-1.5 font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
          >
            <BookMarked className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Open {selectedBook.name} chapter grid</span>
          </button>
        ) : null}
      </div>
    </section>
  );
};
