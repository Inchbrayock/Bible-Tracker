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
    <div className="space-y-6">
      <section className="sanctuary-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              {subTab === 'journal' ? 'Reading Journal' : 'Guided Reading Plans'}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {subTab === 'journal'
                ? `${logs.length} reading sessions recorded with notes and calendar dates.`
                : 'Follow a structured path or let your free-form reading automatically mark days complete.'}
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1">
            <button
              type="button"
              onClick={() => setSubTab('journal')}
              aria-pressed={subTab === 'journal'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                subTab === 'journal'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <ScrollText className="h-4 w-4" aria-hidden="true" />
              <span>Log History</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('plans')}
              aria-pressed={subTab === 'plans'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                subTab === 'plans'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              <span>Reading Plans</span>
            </button>
          </div>
        </div>

        {subTab === 'journal' && (
          <div className="relative mt-4">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Filter reading journal"
              placeholder="Search logs by book, reflection note, or date (YYYY-MM-DD)…"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
            />
          </div>
        )}
      </section>

      {subTab === 'plans' ? (
        <PlansView />
      ) : sortedLogs.length === 0 ? (
        <div className="sanctuary-card p-8 text-center">
          <p className="font-display text-lg font-semibold text-[var(--text-primary)]">
            {logs.length === 0 ? 'Your journal awaits its first entry' : 'No matching entries'}
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {logs.length === 0
              ? 'Log a chapter from the Sanctuary Dashboard or Books Library.'
              : 'Try a different search filter.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sortedLogs.map((log) => {
            const book = BOOKS_BY_ID[log.bookId];
            if (!book) return null;
            const divMeta = DIVISION_META_BY_ID[book.division];
            const isEditing = editingId === log.id;

            return (
              <li key={log.id} className="sanctuary-card relative overflow-hidden p-4 sm:p-5">
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-1.5"
                  style={{ backgroundColor: divMeta.colorVar }}
                />

                {isEditing ? (
                  <div className="space-y-3 pl-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                        Edit {book.name} Entry
                      </h2>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                          Chapters
                        </label>
                        <input
                          type="text"
                          value={editChapters}
                          onChange={(e) => setEditChapters(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                          Date Read
                        </label>
                        <input
                          type="date"
                          value={editDate}
                          max={todayPlainDate()}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                        Reflection Note
                      </label>
                      <input
                        type="text"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm"
                      />
                    </div>
                    {editError ? (
                      <p role="alert" className="text-xs font-medium text-[var(--color-crimson)]">
                        {editError}
                      </p>
                    ) : null}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void saveEdit(log)}
                        className="rounded-lg bg-[var(--color-sage)] px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3 pl-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <span className="inline-flex items-center gap-1 font-medium tabular-nums">
                          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                          {formatPlainDate(log.readDate)}
                        </span>
                        <span>·</span>
                        <span className="tabular-nums">
                          {log.chapters.length}{' '}
                          {log.chapters.length === 1 ? 'chapter' : 'chapters'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenBook(book.id)}
                        className="mt-1 font-display text-lg font-semibold text-[var(--text-primary)] hover:text-[var(--color-accent)] hover:underline"
                      >
                        {book.name} {formatChapterRanges(log.chapters)}
                      </button>

                      {log.note ? (
                        <p className="mt-1.5 rounded-xl bg-[var(--bg-surface)] px-3 py-2 text-sm italic text-[var(--text-secondary)]">
                          “{log.note}”
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditing(log)}
                        aria-label={`Edit ${book.name} log`}
                        className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>

                      {confirmDeleteId === log.id ? (
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-crimson)] px-2 py-1 text-xs">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[var(--text-secondary)] hover:underline"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void removeLog(log.id);
                              setConfirmDeleteId(null);
                            }}
                            className="font-semibold text-[var(--color-crimson)] hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(log.id)}
                          aria-label={`Delete ${book.name} log`}
                          className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--color-crimson)] hover:text-[var(--color-crimson)]"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
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
