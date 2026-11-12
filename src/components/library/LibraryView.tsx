import React, { useMemo, useState } from 'react';
import { LayoutGrid, Grid3x3, Search } from 'lucide-react';
import { BIBLE_BOOKS, DIVISIONS } from '../../data/bibleCanon';
import { useBibleStore } from '../../store/useBibleStore';
import type { BibleDivision, Testament } from '../../types/bible';
import { BookCard } from './BookCard';
import { WholeBibleMosaic } from './WholeBibleMosaic';

interface LibraryViewProps {
  onOpenBook: (bookId: string) => void;
}

type StatusFilter = 'all' | 'unread' | 'in-progress' | 'completed';
type ViewMode = 'bookshelf' | 'mosaic';

export const LibraryView: React.FC<LibraryViewProps> = ({ onOpenBook }) => {
  const { summary } = useBibleStore();
  const [viewMode, setViewMode] = useState<ViewMode>('bookshelf');
  const [testament, setTestament] = useState<'ALL' | Testament>('ALL');
  const [division, setDivision] = useState<'ALL' | BibleDivision>('ALL');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');

  const availableDivisions = useMemo(
    () =>
      testament === 'ALL'
        ? DIVISIONS
        : DIVISIONS.filter((d) => d.testament === testament),
    [testament]
  );

  const filteredBooks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BIBLE_BOOKS.filter((book) => {
      if (testament !== 'ALL' && book.testament !== testament) return false;
      if (division !== 'ALL' && book.division !== division) return false;

      const bp = summary.bookProgressById[book.id];
      if (status === 'unread' && (bp?.readChapters ?? 0) > 0) return false;
      if (status === 'in-progress' && (!bp || bp.readChapters === 0 || bp.completed))
        return false;
      if (status === 'completed' && !bp?.completed) return false;

      if (
        q &&
        !book.name.toLowerCase().includes(q) &&
        !book.shortName.toLowerCase().includes(q) &&
        !book.theme.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [division, query, status, summary.bookProgressById, testament]);

  return (
    <div className="space-y-6">
      {/* Header & View Mode Switcher */}
      <section className="sanctuary-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              Scripture Library
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              66 books · {summary.booksCompleted} completed · {summary.totalChaptersRead.toLocaleString()} of 1,189 chapters read
            </p>
          </div>

          <div
            className="inline-flex rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1"
            role="group"
            aria-label="Library view mode"
          >
            <button
              type="button"
              onClick={() => setViewMode('bookshelf')}
              aria-pressed={viewMode === 'bookshelf'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'bookshelf'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              <span>Bookshelf</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mosaic')}
              aria-pressed={viewMode === 'mosaic'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'mosaic'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <Grid3x3 className="h-4 w-4" aria-hidden="true" />
              <span>1,189 Mosaic</span>
            </button>
          </div>
        </div>

        {viewMode === 'bookshelf' && (
          <div className="mt-5 space-y-3 border-t border-[var(--border-subtle)] pt-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative min-w-52 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search Bible books"
                  placeholder="Search book or theme (e.g. Psalms, Grace, Rom)…"
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
                />
              </div>

              {/* Testament */}
              <div className="inline-flex rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1 text-xs font-semibold">
                {(['ALL', 'OT', 'NT'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTestament(t);
                      setDivision('ALL');
                    }}
                    aria-pressed={testament === t}
                    className={`rounded-lg px-3 py-1.5 transition-colors ${
                      testament === t
                        ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xs'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {t === 'ALL' ? 'All (66)' : t === 'OT' ? 'Old (39)' : 'New (27)'}
                  </button>
                ))}
              </div>

              {/* Status */}
              <select
                aria-label="Filter books by completion status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]"
              >
                <option value="all">All Statuses</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="unread">Unread</option>
              </select>
            </div>

            {/* Division Chips */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setDivision('ALL')}
                aria-pressed={division === 'ALL'}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  division === 'ALL'
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                All Divisions
              </button>
              {availableDivisions.map((div) => (
                <button
                  key={div.id}
                  type="button"
                  onClick={() => setDivision(div.id)}
                  aria-pressed={division === div.id}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    division === div.id
                      ? 'border-[var(--text-primary)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: div.colorVar }}
                  />
                  {div.shortLabel}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {viewMode === 'mosaic' ? (
        <WholeBibleMosaic onSelectBook={onOpenBook} />
      ) : filteredBooks.length === 0 ? (
        <div className="sanctuary-card p-8 text-center">
          <p className="font-display text-lg font-semibold text-[var(--text-primary)]">
            No matching books found
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Try clearing your search or status filter.
          </p>
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.id}
              progress={summary.bookProgressById[book.id]}
              onSelect={onOpenBook}
            />
          ))}
        </div>
      )}
    </div>
  );
};
