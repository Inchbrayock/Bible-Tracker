import React, { useState } from 'react';
import { BIBLE_BOOKS, DIVISION_META_BY_ID } from '../../data/bibleCanon';
import { useBibleStore } from '../../store/useBibleStore';
import type { CanonBook } from '../../types/bible';

interface CanonicalSpineBarProps {
  onOpenBook: (bookId: string) => void;
}

export const CanonicalSpineBar: React.FC<CanonicalSpineBarProps> = ({ onOpenBook }) => {
  const { summary } = useBibleStore();
  const [hoveredBook, setHoveredBook] = useState<CanonBook | null>(null);

  const otBooks = BIBLE_BOOKS.filter((b) => b.testament === 'OT');
  const ntBooks = BIBLE_BOOKS.filter((b) => b.testament === 'NT');

  const hoveredProgress = hoveredBook ? summary.bookProgressById[hoveredBook.id] : null;
  const hoveredDiv = hoveredBook ? DIVISION_META_BY_ID[hoveredBook.division] : null;

  const renderSegment = (books: CanonBook[]) =>
    books.map((book) => {
      const bp = summary.bookProgressById[book.id];
      const divMeta = DIVISION_META_BY_ID[book.division];
      const pct = bp?.percentage ?? 0;
      const isComplete = bp?.completed ?? false;
      const isActive = hoveredBook?.id === book.id;

      return (
        <button
          key={book.id}
          type="button"
          onClick={() => onOpenBook(book.id)}
          onMouseEnter={() => setHoveredBook(book)}
          onFocus={() => setHoveredBook(book)}
          onMouseLeave={() => setHoveredBook(null)}
          onBlur={() => setHoveredBook(null)}
          style={{ flexGrow: book.chapterCount, flexBasis: 0 }}
          aria-label={`${book.name}: ${bp?.readChapters ?? 0} of ${book.chapterCount} chapters read`}
          className={`group relative h-11 min-w-[2px] overflow-hidden rounded-[2px] bg-[var(--bg-subtle)] transition-colors sm:h-12 sm:min-w-[3px] ${
            isActive ? 'ring-1 ring-[var(--text-primary)] ring-offset-1 ring-offset-[var(--bg-elevated)]' : ''
          }`}
        >
          {/* Baseline highlight when unread & hovered */}
          <span
            aria-hidden="true"
            className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-20"
            style={{ backgroundColor: divMeta.colorVar }}
          />
          {/* Proportional vertical fill */}
          {pct > 0 && (
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 transition-[height] duration-300"
              style={{
                height: `${pct}%`,
                backgroundColor: isComplete ? 'var(--color-sage)' : divMeta.colorVar,
              }}
            />
          )}
        </button>
      );
    });

  return (
    <div className="pt-5">
      {/* Live Inspection Line */}
      <div className="mb-2.5 flex min-h-5 flex-wrap items-baseline justify-between gap-2 text-xs">
        {hoveredBook && hoveredProgress && hoveredDiv ? (
          <>
            <div className="flex items-baseline gap-2.5">
              <span className="font-display text-sm font-medium text-[var(--text-primary)]">
                {hoveredBook.name}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: hoveredDiv.colorVar }}
                />
                {hoveredDiv.label}
              </span>
            </div>
            <span className="font-medium tabular-nums text-[var(--text-primary)]">
              {hoveredProgress.readChapters} of {hoveredProgress.totalChapters} chapters (
              {Math.round(hoveredProgress.percentage)}%)
            </span>
          </>
        ) : (
          <>
            <span className="text-[var(--text-secondary)]">
              All 66 books scaled by chapter count. Select any spine to open its chapter grid.
            </span>
            <span className="hidden text-[var(--text-secondary)] tabular-nums sm:inline">
              Genesis to Revelation
            </span>
          </>
        )}
      </div>

      {/* 66-Book Proportional Spine Track (stacked on mobile so NT books stay readable/tappable, side-by-side on sm+) */}
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3"
        role="group"
        aria-label="66-book canonical progress bar"
      >
        <div className="spine-segment-ot min-w-0">
          <div className="flex min-w-0 items-stretch gap-px sm:gap-[2px]">
            {renderSegment(otBooks)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[0.7rem] text-[var(--text-secondary)] tabular-nums sm:hidden">
            <span>Old Testament</span>
            <span>39 books, 929 ch</span>
          </div>
        </div>
        <div className="hidden w-px shrink-0 bg-[var(--border-strong)] sm:block" aria-hidden="true" />
        <div className="spine-segment-nt min-w-0">
          <div className="flex min-w-0 items-stretch gap-px sm:gap-[2px]">
            {renderSegment(ntBooks)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[0.7rem] text-[var(--text-secondary)] tabular-nums sm:hidden">
            <span>New Testament</span>
            <span>27 books, 260 ch</span>
          </div>
        </div>
      </div>

      {/* Testament Span Labels (Desktop / Tablet) */}
      <div className="mt-2 hidden items-center justify-between text-[0.72rem] text-[var(--text-secondary)] tabular-nums sm:flex">
        <span>Old Testament (39 books, 929 chapters)</span>
        <span>New Testament (27 books, 260 chapters)</span>
      </div>
    </div>
  );
};
