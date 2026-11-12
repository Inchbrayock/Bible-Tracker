import React, { useMemo, useState } from 'react';
import { Grid3x3, LayoutGrid, Search } from 'lucide-react';
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

  const otFiltered = useMemo(
    () => filteredBooks.filter((b) => b.testament === 'OT'),
    [filteredBooks]
  );
  const ntFiltered = useMemo(
    () => filteredBooks.filter((b) => b.testament === 'NT'),
    [filteredBooks]
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header & Filter Controls */}
      <section className="border-b border-[var(--border-subtle)] pb-5 sm:pb-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight text-[var(--text-primary)] sm:text-[2.15rem]">
              Scripture Library
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)] tabular-nums">
              {summary.booksCompleted} of 66 books completed, {summary.totalChaptersRead.toLocaleString()} of 1,189 chapters read
            </p>
          </div>

          <div
            className="grid w-full grid-cols-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 sm:inline-flex sm:w-auto"
            role="group"
            aria-label="Library view mode"
          >
            <button
              type="button"
              onClick={() => setViewMode('bookshelf')}
              aria-pressed={viewMode === 'bookshelf'}
              className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[4px] px-3 py-1.5 text-sm font-medium transition-colors sm:min-h-0 ${
                viewMode === 'bookshelf'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              <span>Bookshelf</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mosaic')}
              aria-pressed={viewMode === 'mosaic'}
              className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[4px] px-3 py-1.5 text-sm font-medium transition-colors sm:min-h-0 ${
                viewMode === 'mosaic'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Grid3x3 className="h-4 w-4" aria-hidden="true" />
              <span>1,189 Mosaic</span>
            </button>
          </div>
        </div>

        {viewMode === 'bookshelf' && (
          <div className="mt-5 space-y-3.5 sm:mt-6 sm:space-y-4">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              {/* Search */}
              <div className="relative w-full sm:min-w-56 sm:flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search Bible books"
                  placeholder="Search book or theme (Psalms, Grace, Rom)…"
                  className="folio-input min-h-11 w-full py-2 pl-9 pr-3 text-base placeholder:text-[var(--text-secondary)] sm:min-h-10 sm:text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5 sm:contents">
                {/* Testament */}
                <div className="grid flex-1 grid-cols-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 text-xs font-medium sm:inline-flex sm:flex-none">
                  {(['ALL', 'OT', 'NT'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTestament(t);
                        setDivision('ALL');
                      }}
                      aria-pressed={testament === t}
                      className={`min-h-9 rounded-[4px] px-2 py-1.5 transition-colors sm:min-h-0 sm:px-3 ${
                        testament === t
                          ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
                  className="folio-input min-h-10 px-3 py-2 text-base font-medium sm:min-h-0 sm:text-xs"
                >
                  <option value="all">All statuses</option>
                  <option value="in-progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="unread">Unread</option>
                </select>
              </div>
            </div>

            {/* Division Chips (horizontal scroll rail on mobile, wrap on sm+) */}
            <div className="-mx-3.5 flex flex-nowrap gap-1.5 overflow-x-auto px-3.5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
              <button
                type="button"
                onClick={() => setDivision('ALL')}
                aria-pressed={division === 'ALL'}
                className={`min-h-9 shrink-0 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-medium transition-colors sm:min-h-0 sm:px-2.5 sm:py-1 ${
                  division === 'ALL'
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                }`}
              >
                All divisions
              </button>
              {availableDivisions.map((div) => (
                <button
                  key={div.id}
                  type="button"
                  onClick={() => setDivision(div.id)}
                  aria-pressed={division === div.id}
                  className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-medium transition-colors sm:min-h-0 sm:px-2.5 sm:py-1 ${
                    division === div.id
                      ? 'border-[var(--text-primary)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
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
        <div className="folio-sheet p-10 text-center">
          <p className="font-display text-xl font-medium text-[var(--text-primary)]">
            No matching books found
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Clear your search or choose another status filter.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {otFiltered.length > 0 && (
            <section aria-labelledby="ot-section-heading">
              <div className="mb-4 flex items-baseline justify-between border-b border-[var(--border-subtle)] pb-2">
                <h2
                  id="ot-section-heading"
                  className="font-display text-xl font-medium text-[var(--text-primary)]"
                >
                  Old Testament
                </h2>
                <span className="text-xs text-[var(--text-secondary)] tabular-nums">
                  {otFiltered.length} {otFiltered.length === 1 ? 'book' : 'books'}
                </span>
              </div>
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {otFiltered.map((book) => (
                  <BookCard
                    key={book.id}
                    progress={summary.bookProgressById[book.id]}
                    onSelect={onOpenBook}
                  />
                ))}
              </div>
            </section>
          )}

          {ntFiltered.length > 0 && (
            <section aria-labelledby="nt-section-heading">
              <div className="mb-4 flex items-baseline justify-between border-b border-[var(--border-subtle)] pb-2">
                <h2
                  id="nt-section-heading"
                  className="font-display text-xl font-medium text-[var(--text-primary)]"
                >
                  New Testament
                </h2>
                <span className="text-xs text-[var(--text-secondary)] tabular-nums">
                  {ntFiltered.length} {ntFiltered.length === 1 ? 'book' : 'books'}
                </span>
              </div>
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {ntFiltered.map((book) => (
                  <BookCard
                    key={book.id}
                    progress={summary.bookProgressById[book.id]}
                    onSelect={onOpenBook}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
