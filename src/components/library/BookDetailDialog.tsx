import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  CheckCheck,
  RotateCw,
  Trash2,
  X,
} from 'lucide-react';
import { BOOKS_BY_ID, DIVISION_META_BY_ID } from '../../data/bibleCanon';
import { formatPlainDate, todayPlainDate } from '../../lib/dates';
import { useBibleStore } from '../../store/useBibleStore';
import { ModalDialog } from '../ui/ModalDialog';

interface BookDetailDialogProps {
  bookId: string | null;
  onClose: () => void;
}

export const BookDetailDialog: React.FC<BookDetailDialogProps> = ({ bookId, onClose }) => {
  const {
    summary,
    toggleChapter,
    logChapters,
    markBookComplete,
    clearBookProgress,
  } = useBibleStore();

  const [readDate, setReadDate] = useState<string>(() => todayPlainDate());
  const [rereadMode, setRereadMode] = useState(false);
  const [lastAnchorChapter, setLastAnchorChapter] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    setLastAnchorChapter(null);
    setConfirmClear(false);
    setRereadMode(false);
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

    // Shift+Click logs the contiguous range between the last clicked chapter and this one
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
    if (!isAlreadyRead || rereadMode) {
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
        <div className="flex max-h-[88dvh] flex-col">
          {/* Header */}
          <div className="relative border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-4 sm:px-6">
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-2"
              style={{ backgroundColor: divMeta.colorVar }}
            />
            <div className="flex items-start justify-between gap-4 pl-2">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <span>{book.testament === 'OT' ? 'Old Testament' : 'New Testament'}</span>
                  <span>·</span>
                  <span>{divMeta.label}</span>
                  {bp.completedCycles >= 2 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-[0.68rem] text-[var(--color-accent)]">
                      <RotateCw className="h-3 w-3" aria-hidden="true" />
                      {bp.completedCycles}× Read-Throughs
                    </span>
                  )}
                </div>
                <h2
                  id="book-detail-title"
                  className="mt-1 font-display text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl"
                >
                  {book.name}
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)] sm:text-sm">
                  {book.theme}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Close ${book.name} sheet`}
                className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 pl-2">
              <div className="flex items-center justify-between text-xs font-semibold tabular-nums">
                <span className="text-[var(--text-primary)]">
                  {bp.readChapters} of {bp.totalChapters} chapters read ({Math.round(bp.percentage)}%)
                </span>
                {bp.nextUnreadChapter !== null ? (
                  <span className="text-[var(--color-accent)]">
                    Next unread: Ch. {bp.nextUnreadChapter}
                  </span>
                ) : (
                  <span className="text-[var(--color-sage)]">Book Complete</span>
                )}
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                <motion.div
                  className="h-full rounded-full"
                  initial={false}
                  animate={{ width: `${bp.percentage}%` }}
                  transition={{ duration: 0.4 }}
                  style={{
                    backgroundColor: bp.completed ? 'var(--color-sage)' : divMeta.colorVar,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-5 py-3.5 sm:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label
                  htmlFor="sheet-date-input"
                  className="block text-[0.68rem] font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
                >
                  Log Date
                </label>
                <input
                  id="sheet-date-input"
                  type="date"
                  value={readDate}
                  max={todayPlainDate()}
                  onChange={(e) => setReadDate(e.target.value)}
                  className="mt-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)]"
                />
              </div>

              <div>
                <span className="block text-[0.68rem] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Tap Mode
                </span>
                <div className="mt-1 inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setRereadMode(false)}
                    aria-pressed={!rereadMode}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                      !rereadMode
                        ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xs'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    Toggle
                  </button>
                  <button
                    type="button"
                    onClick={() => setRereadMode(true)}
                    aria-pressed={rereadMode}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
                      rereadMode
                        ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] shadow-2xs'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    <RotateCw className="h-3 w-3" aria-hidden="true" />
                    +1 Re-read
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void markBookComplete(book.id, readDate)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[var(--color-sage)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{bp.completed ? 'Log Full Re-Read' : 'Mark All Read'}</span>
              </button>

              {bp.readChapters > 0 && !confirmClear && (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--color-crimson)] hover:text-[var(--color-crimson)]"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              )}

              {confirmClear && (
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-crimson)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="font-medium text-[var(--text-secondary)] hover:underline"
                  >
                    Keep
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void clearBookProgress(book.id);
                      setConfirmClear(false);
                    }}
                    className="font-semibold text-[var(--color-crimson)] hover:underline"
                  >
                    Confirm Reset
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Scrollable Chapter Grid */}
          <div className="overflow-y-auto p-5 sm:p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[var(--text-secondary)]">
                Tip: Hold <kbd className="rounded border border-[var(--border-strong)] px-1 py-0.5 text-[0.68rem]">Shift</kbd> and click two chapters to log a full range at once.
              </p>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                aria-label="Optional reflection note for next chapter click"
                placeholder="Optional note for next click…"
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] sm:w-56"
              />
            </div>

            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
              {Array.from({ length: book.chapterCount }, (_, idx) => {
                const ch = idx + 1;
                const state = bp.chapterMap[ch];
                const isRead = Boolean(state);
                const readCount = state?.readCount ?? 0;

                return (
                  <motion.button
                    key={ch}
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.18,
                      delay: Math.min(idx * 0.008, 0.28),
                    }}
                    onClick={(e) => void handleChapterClick(e, ch)}
                    aria-pressed={isRead}
                    title={
                      state
                        ? `${book.name} ${ch} · Read ${readCount}× (Last: ${formatPlainDate(state.lastReadDate)})`
                        : `${book.name} ${ch} · Unread`
                    }
                    className={`relative flex min-h-11 flex-col items-center justify-center rounded-xl border text-sm font-semibold tabular-nums transition-colors ${
                      isRead
                        ? 'chapter-tile-read border-[var(--color-sage)] bg-[var(--color-sage-soft)] text-[var(--color-sage)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--color-accent)]'
                    }`}
                  >
                    <span>{ch}</span>
                    {readCount >= 2 ? (
                      <span className="text-[0.6rem] font-bold leading-none text-[var(--color-accent)]">
                        {readCount}×
                      </span>
                    ) : isRead ? (
                      <Check className="h-3 w-3 opacity-80" aria-hidden="true" />
                    ) : null}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </ModalDialog>
  );
};
