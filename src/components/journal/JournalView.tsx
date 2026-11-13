import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Calendar, Compass, Edit3, ScrollText, Search, Trash2, X } from 'lucide-react';
import { BOOKS_BY_ID, DIVISION_META_BY_ID } from '../../data/bibleCanon';
import { formatPlainDate, todayPlainDate } from '../../lib/dates';
import { indexReadingLogForSearch, matchesIndexedReadingLog } from '../../lib/logSearch';
import { FOLIO_EASE, SPRING_TACTILE, TACTILE_PILL_TAP, TACTILE_TAP } from '../../lib/motion';
import { formatChapterRanges, parseChapterInput } from '../../lib/progress';
import { useBibleStore } from '../../store/useBibleStore';
import type { ReadingLogEntry } from '../../types/bible';
import { PlansView } from './PlansView';

interface JournalViewProps {
  onOpenBook: (bookId: string) => void;
  initialSubTab?: 'journal' | 'plans';
}

export const JournalView: React.FC<JournalViewProps> = ({
  onOpenBook,
  initialSubTab = 'journal',
}) => {
  const { logs, editLog, removeLog } = useBibleStore();
  const [subTab, setSubTab] = useState<'journal' | 'plans'>(initialSubTab);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editChapters, setEditChapters] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const indexedLogs = useMemo(() => {
    return [...logs]
      .filter((log) => Boolean(BOOKS_BY_ID[log.bookId]))
      .sort((a, b) => b.readDate.localeCompare(a.readDate) || b.loggedAt.localeCompare(a.loggedAt))
      .map((log) => indexReadingLogForSearch(log, BOOKS_BY_ID[log.bookId]));
  }, [logs]);

  const sortedLogs = useMemo(() => {
    if (!search.trim()) {
      return indexedLogs.map((entry) => entry.log);
    }
    return indexedLogs
      .filter((entry) => matchesIndexedReadingLog(entry, search))
      .map((entry) => entry.log);
  }, [indexedLogs, search]);

  const startEditing = (log: ReadingLogEntry) => {
    setEditingId(log.id);
    setEditDate(log.readDate);
    setEditChapters(formatChapterRanges(log.chapters));
    setEditNote(log.note ?? '');
    setEditError(null);
  };

  const saveEdit = async (log: ReadingLogEntry) => {
    const book = BOOKS_BY_ID[log.bookId];
    if (!book) return;
    const parsed = parseChapterInput(editChapters, book.chapterCount);
    if (parsed.length === 0) {
      setEditError(`Enter chapters between 1 and ${book.chapterCount}.`);
      return;
    }
    await editLog(log.id, {
      chapters: parsed,
      readDate: editDate || todayPlainDate(),
      note: editNote,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="border-b border-[var(--border-subtle)] pb-5 sm:pb-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight text-[var(--text-primary)] sm:text-[2.15rem]">
              {subTab === 'journal' ? 'Reading Journal' : 'Guided Reading Plans'}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {subTab === 'journal'
                ? search.trim()
                  ? `Showing ${sortedLogs.length} of ${indexedLogs.length} ${indexedLogs.length === 1 ? 'session' : 'sessions'} matching “${search.trim()}”.`
                  : `${indexedLogs.length} ${indexedLogs.length === 1 ? 'reading session' : 'reading sessions'} recorded with notes and calendar dates.`
                : 'Follow a structured path or let your free-form reading automatically mark days complete.'}
            </p>
          </div>

          <div className="grid w-full grid-cols-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 sm:inline-flex sm:w-auto">
            {(
              [
                { id: 'journal', label: 'Log History', icon: ScrollText },
                { id: 'plans', label: 'Reading Plans', icon: Compass },
              ] as const
            ).map((tabOpt) => {
              const Icon = tabOpt.icon;
              const isActive = subTab === tabOpt.id;
              return (
                <motion.button
                  key={tabOpt.id}
                  type="button"
                  whileTap={TACTILE_PILL_TAP}
                  onClick={() => setSubTab(tabOpt.id)}
                  aria-pressed={isActive}
                  className={`relative inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[4px] px-3 py-1.5 text-sm font-medium transition-colors sm:min-h-0 ${
                    isActive
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="journal-subtab-pill"
                      transition={SPRING_TACTILE}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-[4px] bg-[var(--bg-elevated)] shadow-2xs"
                    />
                  )}
                  <span className="relative z-10 inline-flex items-center gap-1.5">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{tabOpt.label}</span>
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {subTab === 'journal' && (
            <motion.div
              key="journal-search-wrap"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: FOLIO_EASE }}
              className="overflow-hidden"
            >
              <div className="relative mt-4 max-w-xl sm:mt-5">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && search) {
                      e.preventDefault();
                      setSearch('');
                    }
                  }}
                  aria-label="Filter reading journal"
                  placeholder="Search logs by book, chapter, reflection note, or date…"
                  className="folio-input min-h-11 w-full py-2 pl-9 pr-10 text-base placeholder:text-[var(--text-secondary)] sm:min-h-10 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    className="tactile-press absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {subTab === 'plans' ? (
        <motion.div
          key="plans-panel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: FOLIO_EASE }}
        >
          <PlansView />
        </motion.div>
      ) : sortedLogs.length === 0 ? (
        <motion.div
          key="journal-empty"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.18, ease: FOLIO_EASE }}
          className="folio-sheet p-10 text-center"
        >
          <p className="font-display text-xl font-medium text-[var(--text-primary)]">
            {indexedLogs.length === 0 ? 'Your journal awaits its first entry' : 'No matching entries'}
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {indexedLogs.length === 0
              ? 'Log a chapter from the Sanctuary Dashboard or Books Library.'
              : 'Try searching by book, chapter (e.g. Romans 8), note, or date (e.g. Nov 12).'}
          </p>
          {indexedLogs.length > 0 && search ? (
            <motion.button
              type="button"
              whileTap={TACTILE_TAP}
              onClick={() => setSearch('')}
              className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]"
            >
              Reset search
            </motion.button>
          ) : null}
        </motion.div>
      ) : (
        <motion.ul
          key="journal-list"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: FOLIO_EASE }}
          className="folio-sheet divide-y divide-[var(--border-subtle)] overflow-hidden"
        >
          {sortedLogs.map((log) => {
            const book = BOOKS_BY_ID[log.bookId];
            if (!book) return null;
            const divMeta = DIVISION_META_BY_ID[book.division];
            const isEditing = editingId === log.id;

            return (
              <motion.li
                key={log.id}
                layout="position"
                transition={{ duration: 0.2, ease: FOLIO_EASE }}
                className="relative p-4 sm:px-7 sm:py-5"
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
                          className="space-y-3 pl-3"
                        >
                          <h2 className="font-display text-lg font-medium text-[var(--text-primary)]">
                            Edit {book.name} entry
                          </h2>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                                Chapters
                              </label>
                              <input
                                type="text"
                                value={editChapters}
                                onChange={(e) => setEditChapters(e.target.value)}
                                className="folio-input mt-1 min-h-10 w-full px-3 py-1.5 text-base sm:text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                                Date read
                              </label>
                              <input
                                type="date"
                                value={editDate}
                                max={todayPlainDate()}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="folio-input mt-1 min-h-10 w-full px-3 py-1.5 text-base sm:text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)]">
                              Reflection note
                            </label>
                            <input
                              type="text"
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              className="folio-input mt-1 min-h-10 w-full px-3 py-1.5 text-base sm:text-sm"
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
                              onClick={() => void saveEdit(log)}
                              className="btn-sage min-h-10 rounded-md px-3.5 py-1.5 text-xs font-medium sm:min-h-9"
                            >
                              Save changes
                            </motion.button>
                            <motion.button
                              type="button"
                              whileTap={TACTILE_TAP}
                              onClick={() => setEditingId(null)}
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
                          className="flex flex-wrap items-start justify-between gap-3 pl-3 sm:gap-4"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                              <span className="inline-flex items-center gap-1.5 font-medium tabular-nums">
                                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                                {formatPlainDate(log.readDate)}
                              </span>
                              <span className="tabular-nums">
                                {log.chapters.length}{' '}
                                {log.chapters.length === 1 ? 'chapter' : 'chapters'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => onOpenBook(book.id)}
                              className="tactile-press mt-1 text-left font-display text-xl font-medium text-[var(--text-primary)] hover:text-[var(--color-accent)] hover:underline"
                            >
                              {book.name} {formatChapterRanges(log.chapters)}
                            </button>

                            {log.note ? (
                              <blockquote
                                className="mt-2 max-w-[65ch] border-l-2 pl-3 font-display text-[0.98rem] italic leading-relaxed text-[var(--text-secondary)]"
                                style={{ borderColor: divMeta.colorVar }}
                              >
                                {log.note}
                              </blockquote>
                            ) : null}
                          </div>

                          <div className="flex shrink-0 items-center gap-2 sm:gap-1.5">
                            <motion.button
                              type="button"
                              whileTap={TACTILE_PILL_TAP}
                              onClick={() => startEditing(log)}
                              aria-label={`Edit ${book.name} log`}
                              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:min-h-8 sm:min-w-8"
                            >
                              <Edit3 className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                            </motion.button>

                            {confirmDeleteId === log.id ? (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.94 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={SPRING_TACTILE}
                                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-crimson)] p-1 text-xs"
                              >
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="min-h-8 rounded px-2 text-[var(--text-secondary)] hover:underline"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void removeLog(log.id);
                                    setConfirmDeleteId(null);
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
                                onClick={() => setConfirmDeleteId(log.id)}
                                aria-label={`Delete ${book.name} log`}
                                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--color-crimson)] hover:text-[var(--color-crimson)] sm:min-h-8 sm:min-w-8"
                              >
                                <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
          </motion.ul>
        )}
    </div>
  );
};
