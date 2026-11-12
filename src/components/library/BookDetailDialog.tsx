import React, { useEffect, useState } from 'react';
import { Check, CheckCheck, RotateCw, Trash2, X } from 'lucide-react';
import { BOOKS_BY_ID, DIVISION_META_BY_ID } from '../../data/bibleCanon';
import { formatPlainDate, todayPlainDate } from '../../lib/dates';
import { useBibleStore } from '../../store/useBibleStore';
import { ModalDialog } from '../ui/ModalDialog';

interface BookDetailDialogProps {
  bookId: string | null;
  onClose: () => void;
}

type TapMode = 'toggle' | 'range' | 'reread';

export const BookDetailDialog: React.FC<BookDetailDialogProps> = ({ bookId, onClose }) => {
  const {
    summary,
    toggleChapter,
    logChapters,
    markBookComplete,
    clearBookProgress,
  } = useBibleStore();

  const [readDate, setReadDate] = useState<string>(() => todayPlainDate());
  const [tapMode, setTapMode] = useState<TapMode>('toggle');
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [lastAnchorChapter, setLastAnchorChapter] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    setLastAnchorChapter(null);
    setConfirmClear(false);
    setTapMode('toggle');
    setRangeStart(null);
    setNote('');
  }, [bookId]);

  const book = bookId ? BOOKS_BY_ID[bookId] : null;
  const bp = book ? summary.bookProgressById[book.id] : null;
  const divMeta = book ? DIVISION_META_BY_ID[book.division] : null;

  const handleChapterClick = async (
    e: React.MouseEvent<HTMLButtonElement>,
    chapter: number
  ) => {
    if (!book) return;

    if (tapMode === 'range') {
      if (rangeStart === null) {
        setRangeStart(chapter);
        return;
      }
      const start = Math.min(rangeStart, chapter);
      const end = Math.max(rangeStart, chapter);
      const rangeChapters = Array.from(
        { length: end - start + 1 },
        (_, idx) => start + idx
      );
      await logChapters({
        bookId: book.id,
        chapters: rangeChapters,
        readDate: readDate || todayPlainDate(),
        note: note.trim() || undefined,
      });
      if (note.trim()) setNote('');
      setRangeStart(null);
      setLastAnchorChapter(chapter);
      return;
    }

    if (e.shiftKey && lastAnchorChapter !== null) {
      const start = Math.min(lastAnchorChapter, chapter);
      const end = Math.max(lastAnchorChapter, chapter);
      const rangeChapters = Array.from(
        { length: end - start + 1 },
        (_, idx) => start + idx
      );
      await logChapters({
        bookId: book.id,
        chapters: rangeChapters,
        readDate: readDate || todayPlainDate(),
        note: note.trim() || undefined,
      });
      setNote('');
      setLastAnchorChapter(chapter);
      return;
    }

    setLastAnchorChapter(chapter);
    const isAlreadyRead = Boolean(bp?.chapterMap[chapter]);
    if (!isAlreadyRead || tapMode === 'reread') {
      await logChapters({
        bookId: book.id,
        chapters: [chapter],
        readDate: readDate || todayPlainDate(),
        note: note.trim() || undefined,
      });
      if (note.trim()) setNote('');
    } else {
      await toggleChapter(book.id, chapter, { rereadMode: false, readDate });
    }
  };

  return (
    <ModalDialog
      open={Boolean(book)}
      onClose={onClose}
      labelledBy="book-detail-title"
      className="max-w-2xl"
    >
      {book && bp && divMeta ? (
        <div className="flex max-h-[92dvh] flex-col sm:max-h-[88dvh]">
          {/* Header */}
          <div className="relative border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-4 sm:px-6 sm:py-5">
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-1.5"
              style={{ backgroundColor: divMeta.colorVar }}
            />
            <div className="flex items-start justify-between gap-3 pl-2 sm:gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                  <span>{book.testament === 'OT' ? 'Old Testament' : 'New Testament'}</span>
                  <span aria-hidden="true">/</span>
                  <span>{divMeta.label}</span>
                  {bp.completedCycles >= 2 && (
                    <span className="inline-flex items-center gap-1 rounded bg-[var(--color-lamp-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--color-lamp)] tabular-nums">
                      <RotateCw className="h-3 w-3" aria-hidden="true" />
                      {bp.completedCycles}× read-throughs
                    </span>
                  )}
                </div>
                <h2
                  id="book-detail-title"
                  className="mt-1 font-display text-2xl font-medium text-[var(--text-primary)] sm:text-3xl"
                >
                  {book.name}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
                  {book.theme}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Close ${book.name} sheet`}
                className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] sm:min-h-9 sm:min-w-9"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mt-3.5 pl-2 sm:mt-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium tabular-nums">
                <span className="text-[var(--text-primary)]">
                  {bp.readChapters} of {bp.totalChapters} chapters read ({Math.round(bp.percentage)}%)
                </span>
                {bp.nextUnreadChapter !== null ? (
                  <span className="text-[var(--color-accent)]">
                    Next unread: Ch. {bp.nextUnreadChapter}
                  </span>
                ) : (
                  <span className="text-[var(--color-sage)]">Book complete</span>
                )}
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{
                    width: `${bp.percentage}%`,
                    backgroundColor: bp.completed ? 'var(--color-sage)' : divMeta.colorVar,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-3 sm:px-6 sm:py-3.5">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
              <div className="flex items-end gap-2 sm:block">
                <div className="min-w-[9.5rem] flex-1 sm:flex-initial">
                  <label
                    htmlFor="sheet-date-input"
                    className="block text-xs font-medium text-[var(--text-secondary)]"
                  >
                    Log date
                  </label>
                  <input
                    id="sheet-date-input"
                    type="date"
                    value={readDate}
                    max={todayPlainDate()}
                    onChange={(e) => setReadDate(e.target.value)}
                    className="folio-input mt-1 min-h-10 w-full px-2.5 py-1.5 text-base font-medium sm:min-h-0 sm:w-auto sm:text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void markBookComplete(book.id, readDate)}
                  className="btn-sage inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90 sm:hidden"
                >
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{bp.completed ? 'Re-Read All' : 'Mark All'}</span>
                </button>
              </div>

              <div>
                <span className="block text-xs font-medium text-[var(--text-secondary)]">
                  Tap mode
                </span>
                <div className="mt-1 grid w-full grid-cols-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 text-xs sm:inline-flex sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setTapMode('toggle');
                      setRangeStart(null);
                    }}
                    aria-pressed={tapMode === 'toggle'}
                    className={`min-h-9 rounded-[4px] px-2 py-1 font-medium transition-colors sm:min-h-0 sm:px-2.5 ${
                      tapMode === 'toggle'
                        ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xs'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    Toggle
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTapMode('range');
                      setRangeStart(null);
                    }}
                    aria-pressed={tapMode === 'range'}
                    className={`min-h-9 rounded-[4px] px-2 py-1 font-medium transition-colors sm:min-h-0 sm:px-2.5 ${
                      tapMode === 'range'
                        ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    Range
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTapMode('reread');
                      setRangeStart(null);
                    }}
                    aria-pressed={tapMode === 'reread'}
                    className={`inline-flex min-h-9 items-center justify-center gap-1 rounded-[4px] px-2 py-1 font-medium transition-colors sm:min-h-0 sm:px-2.5 ${
                      tapMode === 'reread'
                        ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    <RotateCw className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">+1 Re-read</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void markBookComplete(book.id, readDate)}
                className="btn-sage hidden min-h-9 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90 sm:inline-flex"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{bp.completed ? 'Log Full Re-Read' : 'Mark All Read'}</span>
              </button>

              {bp.readChapters > 0 && !confirmClear && (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-md border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--color-crimson)] hover:text-[var(--color-crimson)] sm:w-auto"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              )}

              {confirmClear && (
                <div className="inline-flex w-full items-center justify-end gap-1.5 rounded-md border border-[var(--color-crimson)] bg-[var(--bg-surface)] p-1 text-xs sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="min-h-8 rounded px-2.5 font-medium text-[var(--text-secondary)] hover:underline"
                  >
                    Keep
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void clearBookProgress(book.id);
                      setConfirmClear(false);
                    }}
                    className="min-h-8 rounded px-2.5 font-semibold text-[var(--color-crimson)] hover:underline"
                  >
                    Confirm Reset
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Scrollable Chapter Grid */}
          <div className="overflow-y-auto p-4 sm:p-6">
            <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-[var(--text-secondary)]">
                {tapMode === 'range' ? (
                  rangeStart !== null ? (
                    <span className="font-medium text-[var(--color-accent)]">
                      Selected Ch. {rangeStart}. Tap an ending chapter to log range.{' '}
                      <button
                        type="button"
                        onClick={() => setRangeStart(null)}
                        className="underline"
                      >
                        Clear
                      </button>
                    </span>
                  ) : (
                    <span>Tap a starting chapter, then tap an ending chapter to log a range.</span>
                  )
                ) : (
                  <span>
                    Use <strong>Range</strong> mode (or{' '}
                    <kbd className="hidden rounded border border-[var(--border-strong)] px-1 py-0.5 text-[0.7rem] sm:inline">
                      Shift
                    </kbd>
                    <span className="sm:hidden">two taps</span>
                    <span className="hidden sm:inline">+click</span>) to log multiple chapters at once.
                  </span>
                )}
              </div>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                aria-label="Optional reflection note for next chapter click"
                placeholder="Optional note for next tap…"
                className="folio-input min-h-10 w-full px-3 py-1.5 text-base placeholder:text-[var(--text-secondary)] sm:min-h-0 sm:w-56 sm:px-2.5 sm:text-xs"
              />
            </div>

            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
              {Array.from({ length: book.chapterCount }, (_, idx) => {
                const ch = idx + 1;
                const state = bp.chapterMap[ch];
                const isRead = Boolean(state);
                const readCount = state?.readCount ?? 0;
                const isRangeAnchor = tapMode === 'range' && rangeStart === ch;

                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={(e) => void handleChapterClick(e, ch)}
                    aria-pressed={isRead}
                    title={
                      state
                        ? `${book.name} ${ch} — Read ${readCount}× (Last: ${formatPlainDate(state.lastReadDate)})`
                        : `${book.name} ${ch} — Unread`
                    }
                    className={`relative flex min-h-12 flex-col items-center justify-center rounded-md border text-sm font-medium tabular-nums transition-colors active:scale-95 sm:min-h-11 ${
                      isRangeAnchor
                        ? 'ring-2 ring-[var(--color-accent)] ring-offset-1 ring-offset-[var(--bg-elevated)]'
                        : ''
                    } ${
                      isRead
                        ? 'chapter-tile-read border-[var(--color-sage)] bg-[var(--color-sage-soft)] text-[var(--color-sage)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--color-accent)]'
                    }`}
                  >
                    <span>{ch}</span>
                    {readCount >= 2 ? (
                      <span className="text-[0.62rem] font-semibold leading-none text-[var(--color-lamp)]">
                        {readCount}×
                      </span>
                    ) : isRead ? (
                      <Check className="h-3 w-3 opacity-80" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </ModalDialog>
  );
};
