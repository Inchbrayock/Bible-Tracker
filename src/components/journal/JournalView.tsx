import React, { useMemo, useState } from 'react';
import { Calendar, Compass, Edit3, ScrollText, Search, Trash2 } from 'lucide-react';
import { BOOKS_BY_ID, DIVISION_META_BY_ID } from '../../data/bibleCanon';
import { formatPlainDate, todayPlainDate } from '../../lib/dates';
import { formatChapterRanges, parseChapterInput } from '../../lib/progress';
import { useBibleStore } from '../../store/useBibleStore';
import type { ReadingLogEntry } from '../../types/bible';
import { PlansView } from './PlansView';

interface JournalViewProps {
  onOpenBook: (bookId: string) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({ onOpenBook }) => {
  const { logs, editLog, removeLog } = useBibleStore();
  const [subTab, setSubTab] = useState<'journal' | 'plans'>('journal');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editChapters, setEditChapters] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sortedLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...logs]
      .sort((a, b) => b.readDate.localeCompare(a.readDate) || b.loggedAt.localeCompare(a.loggedAt))
      .filter((log) => {
        if (!q) return true;
        const book = BOOKS_BY_ID[log.bookId];
        return (
          book?.name.toLowerCase().includes(q) ||
          log.note?.toLowerCase().includes(q) ||
          log.readDate.includes(q)
        );
      });
  }, [logs, search]);

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
                ? `${logs.length} reading sessions recorded with notes and calendar dates.`
                : 'Follow a structured path or let your free-form reading automatically mark days complete.'}
            </p>
          </div>

          <div className="grid w-full grid-cols-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 sm:inline-flex sm:w-auto">
            <button
              type="button"
              onClick={() => setSubTab('journal')}
              aria-pressed={subTab === 'journal'}
              className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[4px] px-3 py-1.5 text-sm font-medium transition-colors sm:min-h-0 ${
                subTab === 'journal'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <ScrollText className="h-4 w-4" aria-hidden="true" />
              <span>Log History</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('plans')}
              aria-pressed={subTab === 'plans'}
              className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[4px] px-3 py-1.5 text-sm font-medium transition-colors sm:min-h-0 ${
                subTab === 'plans'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              <span>Reading Plans</span>
            </button>
          </div>
        </div>

        {subTab === 'journal' && (
          <div className="relative mt-4 max-w-xl sm:mt-5">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Filter reading journal"
              placeholder="Search logs by book, reflection note, or date…"
              className="folio-input min-h-11 w-full py-2 pl-9 pr-3 text-base placeholder:text-[var(--text-secondary)] sm:min-h-10 sm:text-sm"
            />
          </div>
        )}
      </section>

      {subTab === 'plans' ? (
        <PlansView />
      ) : sortedLogs.length === 0 ? (
        <div className="folio-sheet p-10 text-center">
          <p className="font-display text-xl font-medium text-[var(--text-primary)]">
            {logs.length === 0 ? 'Your journal awaits its first entry' : 'No matching entries'}
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {logs.length === 0
              ? 'Log a chapter from the Sanctuary Dashboard or Books Library.'
              : 'Try a different search filter.'}
          </p>
        </div>
      ) : (
        <ul className="folio-sheet divide-y divide-[var(--border-subtle)] overflow-hidden">
          {sortedLogs.map((log) => {
            const book = BOOKS_BY_ID[log.bookId];
            if (!book) return null;
            const divMeta = DIVISION_META_BY_ID[book.division];
            const isEditing = editingId === log.id;

            return (
              <li key={log.id} className="relative p-4 sm:px-7 sm:py-5">
                <span
                  aria-hidden="true"
                  className="absolute inset-y-4 left-0 w-1 rounded-r-full"
                  style={{ backgroundColor: divMeta.colorVar }}
                />

                {isEditing ? (
                  <div className="space-y-3 pl-3">
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
                      <button
                        type="button"
                        onClick={() => void saveEdit(log)}
                        className="btn-sage min-h-10 rounded-md px-3.5 py-1.5 text-xs font-medium sm:min-h-9"
                      >
                        Save changes
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="min-h-10 rounded-md border border-[var(--border-subtle)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] sm:min-h-9"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3 pl-3 sm:gap-4">
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
                        className="mt-1 text-left font-display text-xl font-medium text-[var(--text-primary)] hover:text-[var(--color-accent)] hover:underline"
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
                      <button
                        type="button"
                        onClick={() => startEditing(log)}
                        aria-label={`Edit ${book.name} log`}
                        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:min-h-8 sm:min-w-8"
                      >
                        <Edit3 className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                      </button>

                      {confirmDeleteId === log.id ? (
                        <div className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-crimson)] p-1 text-xs">
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
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(log.id)}
                          aria-label={`Delete ${book.name} log`}
                          className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--color-crimson)] hover:text-[var(--color-crimson)] sm:min-h-8 sm:min-w-8"
                        >
                          <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
