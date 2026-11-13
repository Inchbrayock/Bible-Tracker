import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Compass, Edit3, Trash2 } from 'lucide-react';
import { BOOKS_BY_ID, DIVISION_META_BY_ID } from '../../data/bibleCanon';
import { formatPlainDate, todayPlainDate } from '../../lib/dates';
import { getRelativeDateCue } from '../../lib/journal';
import { FOLIO_EASE, SPRING_TACTILE, TACTILE_PILL_TAP, TACTILE_TAP } from '../../lib/motion';
import { getReadingPlanById } from '../../lib/plans';
import { formatChapterRanges, parseChapterInput } from '../../lib/progress';
import { useBibleStore } from '../../store/useBibleStore';
import type { ReadingLogEntry } from '../../types/bible';

interface JournalEntryRowProps {
  log: ReadingLogEntry;
  todayIso: string;
  reflectionFocus?: boolean;
  onOpenBook: (bookId: string) => void;
  onOpenPlan: (planId: string) => void;
  onEditSave: (
    id: string,
    patch: { chapters: number[]; readDate: string; note: string }
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const JournalEntryRow: React.FC<JournalEntryRowProps> = ({
  log,
  todayIso,
  reflectionFocus = false,
  onOpenBook,
  onOpenPlan,
  onEditSave,
  onDelete,
}) => {
  const { customReadingPlans } = useBibleStore();
  const book = BOOKS_BY_ID[log.bookId];
  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState(log.readDate);
  const [editChapters, setEditChapters] = useState(() => formatChapterRanges(log.chapters));
  const [editNote, setEditNote] = useState(log.note ?? '');
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!book) return null;

  const divMeta = DIVISION_META_BY_ID[book.division];
  const linkedPlan = getReadingPlanById(log.planId, customReadingPlans);
  const dateCue = getRelativeDateCue(log.readDate, todayIso);
  const chapterRange = formatChapterRanges(log.chapters);
  const chapterCount = log.chapters.length;

  const startEditing = () => {
    setIsEditing(true);
    setConfirmDelete(false);
    setEditDate(log.readDate);
    setEditChapters(formatChapterRanges(log.chapters));
    setEditNote(log.note ?? '');
    setEditError(null);
  };

  const handleSave = async () => {
    const parsed = parseChapterInput(editChapters, book.chapterCount);
    if (parsed.length === 0) {
      setEditError(`Enter chapters between 1 and ${book.chapterCount}.`);
      return;
    }
    await onEditSave(log.id, {
      chapters: parsed,
      readDate: editDate || todayPlainDate(),
      note: editNote,
    });
    setIsEditing(false);
  };

  return (
    <motion.li
      layout="position"
      transition={{ duration: 0.2, ease: FOLIO_EASE }}
      className="relative p-4 sm:px-6 sm:py-5"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-4 left-0 w-1 rounded-r-full"
        style={{ backgroundColor: divMeta.colorVar }}
      />

      <AnimatePresence mode="wait" initial={false}>
        {isEditing ? (
          <motion.div
            key="editing"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: FOLIO_EASE }}
            className="space-y-3.5 pl-3"
          >
            <h3 className="font-display text-lg font-medium text-[var(--text-primary)]">
              Edit {book.name} entry
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={`edit-chapters-${log.id}`}
                  className="block text-xs font-medium text-[var(--text-secondary)]"
                >
                  Chapters (1–{book.chapterCount})
                </label>
                <input
                  id={`edit-chapters-${log.id}`}
                  type="text"
                  value={editChapters}
                  onChange={(e) => {
                    setEditChapters(e.target.value);
                    setEditError(null);
                  }}
                  className="folio-input mt-1 min-h-10 w-full px-3 py-1.5 text-base sm:text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor={`edit-date-${log.id}`}
                  className="block text-xs font-medium text-[var(--text-secondary)]"
                >
                  Date read
                </label>
                <input
                  id={`edit-date-${log.id}`}
                  type="date"
                  value={editDate}
                  max={todayIso}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="folio-input mt-1 min-h-10 w-full px-3 py-1.5 text-base sm:text-sm"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor={`edit-note-${log.id}`}
                className="block text-xs font-medium text-[var(--text-secondary)]"
              >
                Reflection note
              </label>
              <textarea
                id={`edit-note-${log.id}`}
                rows={3}
                maxLength={2000}
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Write a reflection or verse note…"
                className="folio-input mt-1 w-full resize-y px-3 py-2 font-display text-base leading-relaxed placeholder:font-sans placeholder:text-sm placeholder:text-[var(--text-secondary)] sm:text-[1.02rem]"
              />
            </div>
            {editError ? (
              <p role="alert" className="text-xs font-medium text-[var(--color-crimson)]">
                {editError}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <motion.button
                type="button"
                whileTap={TACTILE_TAP}
                onClick={() => void handleSave()}
                className="btn-sage min-h-10 rounded-md px-3.5 py-1.5 text-xs font-medium sm:min-h-9"
              >
                Save changes
              </motion.button>
              <motion.button
                type="button"
                whileTap={TACTILE_TAP}
                onClick={() => setIsEditing(false)}
                className="min-h-10 rounded-md border border-[var(--border-subtle)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] sm:min-h-9"
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="viewing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="flex flex-col gap-3 pl-3 sm:flex-row sm:items-start sm:gap-6"
          >
            {/* Left Marginalia Metadata Column */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 sm:block sm:w-36 sm:shrink-0 sm:border-r sm:border-[var(--border-subtle)] sm:pr-4 sm:pt-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <time
                  dateTime={log.readDate}
                  className="text-xs font-medium tabular-nums text-[var(--text-primary)]"
                >
                  {formatPlainDate(log.readDate)}
                </time>
                {dateCue ? (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[0.65rem] font-medium leading-none ${
                      dateCue === 'Today'
                        ? 'bg-[var(--color-lamp-soft)] text-[var(--color-lamp)]'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {dateCue}
                  </span>
                ) : null}
              </div>

              <p className="text-xs tabular-nums text-[var(--text-secondary)] sm:mt-1">
                {chapterCount} {chapterCount === 1 ? 'chapter' : 'chapters'}
              </p>

              {linkedPlan ? (
                <button
                  type="button"
                  onClick={() => onOpenPlan(linkedPlan.id)}
                  title={`Open ${linkedPlan.title}`}
                  className="tactile-press mt-0.5 inline-flex items-center gap-1 text-left text-xs font-medium text-[var(--color-accent)] hover:underline sm:mt-2"
                >
                  <Compass className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="line-clamp-1">{linkedPlan.title}</span>
                </button>
              ) : null}
            </div>

            {/* Main Passage & Reflection Column */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onOpenBook(book.id)}
                    className="tactile-press text-left font-display text-xl font-medium text-[var(--text-primary)] hover:text-[var(--color-accent)] hover:underline"
                  >
                    {book.name} {chapterRange}
                  </button>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{divMeta.label}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:gap-1.5">
                  <motion.button
                    type="button"
                    whileTap={TACTILE_PILL_TAP}
                    onClick={startEditing}
                    aria-label={`Edit ${book.name} log`}
                    className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:min-h-8 sm:min-w-8"
                  >
                    <Edit3 className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                  </motion.button>

                  {confirmDelete ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={SPRING_TACTILE}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-crimson)] p-1 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="min-h-8 rounded px-2 text-[var(--text-secondary)] hover:underline"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void onDelete(log.id);
                          setConfirmDelete(false);
                        }}
                        className="min-h-8 rounded px-2 font-semibold text-[var(--color-crimson)] hover:underline"
                      >
                        Delete
                      </button>
                    </motion.div>
                  ) : (
                    <motion.button
                      type="button"
                      whileTap={TACTILE_PILL_TAP}
                      onClick={() => setConfirmDelete(true)}
                      aria-label={`Delete ${book.name} log`}
                      className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--color-crimson)] hover:text-[var(--color-crimson)] sm:min-h-8 sm:min-w-8"
                    >
                      <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                    </motion.button>
                  )}
                </div>
              </div>

              {log.note ? (
                reflectionFocus ? (
                  <p
                    className="mt-3 max-w-[65ch] border-l-2 pl-3.5 font-display text-[1.08rem] leading-[1.7] text-[var(--text-primary)]"
                    style={{ borderColor: divMeta.colorVar }}
                  >
                    {log.note}
                  </p>
                ) : (
                  <blockquote
                    className="mt-2.5 max-w-[65ch] border-l-2 pl-3.5 font-display text-[1.02rem] italic leading-[1.65] text-[color-mix(in_oklab,var(--text-primary)_86%,var(--text-secondary))]"
                    style={{ borderColor: divMeta.colorVar }}
                  >
                    {log.note}
                  </blockquote>
                )
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
};
