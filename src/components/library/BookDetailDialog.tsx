import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCheck, RotateCw, Trash2, X } from 'lucide-react';
import { BOOKS_BY_ID, DIVISION_META_BY_ID } from '../../data/bibleCanon';
import { formatPlainDate, todayPlainDate } from '../../lib/dates';
import { FOLIO_EASE, SPRING_PROGRESS, SPRING_SEAL, SPRING_TACTILE, TACTILE_PILL_TAP, TACTILE_TAP } from '../../lib/motion';
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
  const [stampedChapters, setStampedChapters] = useState<Map<number, number>>(() => new Map());
  const stampTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setLastAnchorChapter(null);
    setConfirmClear(false);
    setTapMode('toggle');
    setRangeStart(null);
    setNote('');
    setStampedChapters(new Map());
    if (stampTimerRef.current !== null) {
      window.clearTimeout(stampTimerRef.current);
      stampTimerRef.current = null;
    }
  }, [bookId]);

  const triggerChapterStamps = (chapters: number[]) => {
    if (chapters.length === 0) return;
    if (stampTimerRef.current !== null) {
      window.clearTimeout(stampTimerRef.current);
    }
    const next = new Map<number, number>();
    chapters.forEach((ch, idx) => {
      next.set(ch, idx);
    });
    setStampedChapters(next);
    stampTimerRef.current = window.setTimeout(() => {
      setStampedChapters(new Map());
      stampTimerRef.current = null;
    }, 680);
  };

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
      triggerChapterStamps(rangeChapters);
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
      triggerChapterStamps(rangeChapters);
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
      triggerChapterStamps([chapter]);
      if (note.trim()) setNote('');
    } else {
      await toggleChapter(book.id, chapter, { rereadMode: false, readDate });
    }
  };

  const handleMarkAll = async () => {
    if (!book || !bp) return;
    const unread: number[] = [];
    for (let ch = 1; ch <= book.chapterCount; ch++) {
      if (!bp.chapterMap[ch]) unread.push(ch);
    }
    const targetChapters =
      unread.length > 0
        ? unread
        : Array.from({ length: book.chapterCount }, (_, idx) => idx + 1);
    await markBookComplete(book.id, readDate);
    triggerChapterStamps(targetChapters);
  };

  const tapModes: { id: TapMode; label: string; icon?: boolean }[] = [
    { id: 'toggle', label: 'Toggle' },
    { id: 'range', label: 'Range' },
    { id: 'reread', label: '+1 Re-read', icon: true },
  ];

  return (
    <ModalDialog
      open={Boolean(book)}
      onClose={onClose}
      labelledBy="book-detail-title"
      className="max-w-2xl"
    >
      {book && bp && divMeta ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Header */}
          <div className="relative shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 pt-6 pb-4 sm:px-6 sm:py-5">
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
                    <motion.span
                      key={bp.completedCycles}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={SPRING_SEAL}
                      className="inline-flex items-center gap-1 rounded bg-[var(--color-lamp-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--color-lamp)] tabular-nums"
                    >
                      <RotateCw className="h-3 w-3" aria-hidden="true" />
                      {bp.completedCycles}× read-throughs
                    </motion.span>
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
              <motion.button
                type="button"
                whileTap={TACTILE_PILL_TAP}
                onClick={onClose}
                aria-label={`Close ${book.name} sheet`}
                className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] sm:min-h-9 sm:min-w-9"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </motion.button>
            </div>

            {/* Progress Bar */}
            <div className="mt-3.5 pl-2 sm:mt-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium tabular-nums">
                <motion.span
                  key={`${bp.readChapters}-${bp.totalChapters}`}
                  initial={{ opacity: 0.4, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={SPRING_TACTILE}
                  className="inline-block text-[var(--text-primary)]"
                >
                  {bp.readChapters} of {bp.totalChapters} chapters read ({Math.round(bp.percentage)}%)
                </motion.span>
                {bp.nextUnreadChapter !== null ? (
                  <span className="text-[var(--color-accent)]">
                    Next unread: Ch. {bp.nextUnreadChapter}
                  </span>
                ) : (
                  <motion.span
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={SPRING_SEAL}
                    className="text-[var(--color-sage)]"
                  >
                    Book complete
                  </motion.span>
                )}
              </div>
              <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                <motion.div
                  className="h-full rounded-full"
                  initial={false}
                  animate={{ width: `${bp.percentage}%` }}
                  transition={SPRING_PROGRESS}
                  style={{
                    backgroundColor: bp.completed ? 'var(--color-sage)' : divMeta.colorVar,
                  }}
                />
                {bp.completed && (
                  <span
                    aria-hidden="true"
                    className="sheen-sweep-anim pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent"
                  />
                )}
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
                <motion.button
                  type="button"
                  whileTap={TACTILE_TAP}
                  transition={SPRING_TACTILE}
                  onClick={() => void handleMarkAll()}
                  className="btn-sage inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90 sm:hidden"
                >
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{bp.completed ? 'Re-Read All' : 'Mark All'}</span>
                </motion.button>
              </div>

              <div>
                <span className="block text-xs font-medium text-[var(--text-secondary)]">
                  Tap mode
                </span>
                <div className="mt-1 grid w-full grid-cols-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 text-xs sm:inline-flex sm:w-auto">
                  {tapModes.map((modeOpt) => {
                    const isActive = tapMode === modeOpt.id;
                    const activePillClass =
                      modeOpt.id === 'toggle'
                        ? 'bg-[var(--bg-elevated)] shadow-2xs'
                        : 'bg-[var(--color-accent-soft)]';
                    const activeTextClass =
                      modeOpt.id === 'toggle'
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--color-accent)]';
                    return (
                      <button
                        key={modeOpt.id}
                        type="button"
                        onClick={() => {
                          setTapMode(modeOpt.id);
                          setRangeStart(null);
                        }}
                        aria-pressed={isActive}
                        className={`relative inline-flex min-h-9 items-center justify-center gap-1 rounded-[4px] px-2 py-1 font-medium transition-colors sm:min-h-0 sm:px-2.5 ${
                          isActive ? activeTextClass : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="sheet-tapmode-pill"
                            transition={SPRING_TACTILE}
                            aria-hidden="true"
                            className={`absolute inset-0 rounded-[4px] ${activePillClass}`}
                          />
                        )}
                        <span className="relative z-10 inline-flex items-center gap-1">
                          {modeOpt.icon && <RotateCw className="h-3 w-3 shrink-0" aria-hidden="true" />}
                          <span className="truncate">{modeOpt.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <motion.button
                type="button"
                whileTap={TACTILE_TAP}
                transition={SPRING_TACTILE}
                onClick={() => void handleMarkAll()}
                className="btn-sage hidden min-h-9 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90 sm:inline-flex"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{bp.completed ? 'Log Full Re-Read' : 'Mark All Read'}</span>
              </motion.button>

              {bp.readChapters > 0 && (
                <AnimatePresence mode="wait" initial={false}>
                  {!confirmClear ? (
                    <motion.button
                      key="reset-btn"
                      type="button"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.14 }}
                      whileTap={TACTILE_TAP}
                      onClick={() => setConfirmClear(true)}
                      className="inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-md border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--color-crimson)] hover:text-[var(--color-crimson)] sm:w-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Reset</span>
                    </motion.button>
                  ) : (
                    <motion.div
                      key="confirm-reset"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={SPRING_TACTILE}
                      className="inline-flex w-full items-center justify-end gap-1.5 rounded-md border border-[var(--color-crimson)] bg-[var(--bg-surface)] p-1 text-xs sm:w-auto"
                    >
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
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Scrollable Chapter Grid */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
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
                const stampOrder = stampedChapters.get(ch);
                const isStamped = stampOrder !== undefined;

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
                    className={`relative flex min-h-12 flex-col items-center justify-center overflow-visible rounded-md border text-sm font-medium tabular-nums transition-[transform,border-color,background-color] duration-150 active:scale-90 sm:min-h-11 ${
                      isRangeAnchor
                        ? 'ring-2 ring-[var(--color-accent)] ring-offset-1 ring-offset-[var(--bg-elevated)] animate-pulse'
                        : ''
                    } ${
                      isRead
                        ? 'chapter-tile-read border-[var(--color-sage)] bg-[var(--color-sage-soft)] text-[var(--color-sage)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--color-accent)]'
                    }`}
                  >
                    {isStamped && (
                      <span
                        aria-hidden="true"
                        className="chapter-ripple-anim pointer-events-none absolute inset-0 rounded-md border-2 border-[var(--color-sage)]"
                        style={{ animationDelay: `${Math.min(stampOrder * 20, 240)}ms` }}
                      />
                    )}
                    {isStamped ? (
                      <motion.span
                        initial={{ scale: 0.72 }}
                        animate={{ scale: [0.72, 1.12, 1] }}
                        transition={{
                          duration: 0.34,
                          delay: Math.min(stampOrder * 0.018, 0.24),
                          ease: FOLIO_EASE,
                        }}
                        className="flex flex-col items-center"
                      >
                        <span>{ch}</span>
                        {readCount >= 2 ? (
                          <span className="text-[0.62rem] font-semibold leading-none text-[var(--color-lamp)]">
                            {readCount}×
                          </span>
                        ) : isRead ? (
                          <svg className="h-3 w-3 opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <motion.path
                              d="M20 6 9 17l-5-5"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{
                                duration: 0.24,
                                delay: Math.min(stampOrder * 0.018, 0.24),
                                ease: FOLIO_EASE,
                              }}
                            />
                          </svg>
                        ) : null}
                      </motion.span>
                    ) : (
                      <>
                        <span>{ch}</span>
                        {readCount >= 2 ? (
                          <span className="text-[0.62rem] font-semibold leading-none text-[var(--color-lamp)]">
                            {readCount}×
                          </span>
                        ) : isRead ? (
                          <svg className="h-3 w-3 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        ) : null}
                      </>
                    )}
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
