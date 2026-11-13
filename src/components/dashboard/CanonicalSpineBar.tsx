import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BIBLE_BOOKS, DIVISIONS, DIVISION_META_BY_ID } from '../../data/bibleCanon';
import { FOLIO_EASE, SPRING_PROGRESS, TACTILE_PILL_TAP } from '../../lib/motion';
import { useBibleStore } from '../../store/useBibleStore';
import type { BibleDivision, CanonBook } from '../../types/bible';

interface CanonicalSpineBarProps {
  onOpenBook: (bookId: string) => void;
}

export const CanonicalSpineBar: React.FC<CanonicalSpineBarProps> = ({ onOpenBook }) => {
  const { summary } = useBibleStore();
  const [hoveredBook, setHoveredBook] = useState<CanonBook | null>(null);
  const [hoveredDivision, setHoveredDivision] = useState<BibleDivision | null>(null);
  const [pinnedDivision, setPinnedDivision] = useState<BibleDivision | null>(null);

  const otBooks = BIBLE_BOOKS.filter((b) => b.testament === 'OT');
  const ntBooks = BIBLE_BOOKS.filter((b) => b.testament === 'NT');

  const divisionStats = useMemo(() => {
    return DIVISIONS.map((div) => {
      const books = BIBLE_BOOKS.filter((b) => b.division === div.id);
      let read = 0;
      let total = 0;
      for (const b of books) {
        total += b.chapterCount;
        read += summary.bookProgressById[b.id]?.readChapters ?? 0;
      }
      return { div, read, total, bookCount: books.length };
    });
  }, [summary.bookProgressById]);

  const activeDivision = hoveredDivision ?? pinnedDivision;
  const hoveredProgress = hoveredBook ? summary.bookProgressById[hoveredBook.id] : null;
  const hoveredDiv = hoveredBook ? DIVISION_META_BY_ID[hoveredBook.division] : null;
  const activeDivisionStat = activeDivision
    ? divisionStats.find((d) => d.div.id === activeDivision) ?? null
    : null;

  const inspectionKey = hoveredBook
    ? `book-${hoveredBook.id}`
    : activeDivisionStat
      ? `div-${activeDivisionStat.div.id}`
      : 'idle';

  const renderSegment = (books: CanonBook[], indexOffset: number) =>
    books.map((book, idx) => {
      const globalIndex = indexOffset + idx;
      const bp = summary.bookProgressById[book.id];
      const divMeta = DIVISION_META_BY_ID[book.division];
      const pct = bp?.percentage ?? 0;
      const isComplete = bp?.completed ?? false;
      const isActive = hoveredBook?.id === book.id;
      const isDivisionHighlighted = activeDivision === book.division;
      const isDimmedByDivision = activeDivision !== null && activeDivision !== book.division;

      return (
        <motion.button
          key={book.id}
          type="button"
          onClick={() => onOpenBook(book.id)}
          onMouseEnter={() => setHoveredBook(book)}
          onFocus={() => setHoveredBook(book)}
          onMouseLeave={() => setHoveredBook(null)}
          onBlur={() => setHoveredBook(null)}
          animate={{
            y: isDivisionHighlighted || isActive ? -2.5 : 0,
            opacity: isDimmedByDivision ? 0.34 : 1,
          }}
          whileTap={{ scaleY: 0.92 }}
          transition={{ duration: 0.2, ease: FOLIO_EASE }}
          style={{ flexGrow: book.chapterCount, flexBasis: 0 }}
          aria-label={`${book.name}: ${bp?.readChapters ?? 0} of ${book.chapterCount} chapters read`}
          className={`group relative h-11 min-w-[2px] overflow-hidden rounded-[2px] bg-[var(--bg-subtle)] transition-shadow sm:h-12 sm:min-w-[3px] ${
            isActive || isDivisionHighlighted
              ? 'ring-1 ring-[var(--text-primary)] ring-offset-1 ring-offset-[var(--bg-elevated)]'
              : ''
          }`}
        >
          {/* Baseline highlight when unread & hovered (or division spotlighted) */}
          <span
            aria-hidden="true"
            className={`absolute inset-0 transition-opacity ${
              isDivisionHighlighted ? 'opacity-28' : 'opacity-0 group-hover:opacity-20'
            }`}
            style={{ backgroundColor: divMeta.colorVar }}
          />
          {/* Proportional vertical fill with signature left-to-right opening wave */}
          {pct > 0 && (
            <motion.span
              aria-hidden="true"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1, height: `${pct}%` }}
              transition={{
                scaleY: {
                  duration: 0.45,
                  delay: Math.min(globalIndex * 0.007, 0.42),
                  ease: FOLIO_EASE,
                },
                height: SPRING_PROGRESS,
              }}
              className="absolute inset-x-0 bottom-0 origin-bottom"
              style={{
                backgroundColor: isComplete ? 'var(--color-sage)' : divMeta.colorVar,
              }}
            />
          )}
        </motion.button>
      );
    });

  return (
    <div className="pt-5">
      {/* Live Inspection Line */}
      <div className="mb-2.5 min-h-5 text-xs">
        <motion.div
          key={inspectionKey}
          initial={{ opacity: 0.4, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.14, ease: FOLIO_EASE }}
          className="flex flex-wrap items-baseline justify-between gap-2"
        >
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
          ) : activeDivisionStat ? (
            <>
              <div className="flex items-baseline gap-2.5">
                <span className="inline-flex items-center gap-1.5 font-display text-sm font-medium text-[var(--text-primary)]">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: activeDivisionStat.div.colorVar }}
                  />
                  {activeDivisionStat.div.label}
                </span>
                <span className="text-[var(--text-secondary)]">
                  {activeDivisionStat.bookCount} books
                </span>
              </div>
              <span className="font-medium tabular-nums text-[var(--text-primary)]">
                {activeDivisionStat.read} of {activeDivisionStat.total} chapters (
                {Math.round((activeDivisionStat.read / activeDivisionStat.total) * 100)}%)
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
        </motion.div>
      </div>

      {/* 66-Book Proportional Spine Track (stacked on mobile so NT books stay readable/tappable, side-by-side on sm+) */}
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3"
        role="group"
        aria-label="66-book canonical progress bar"
      >
        <div className="spine-segment-ot min-w-0">
          <div className="flex min-w-0 items-stretch gap-px pt-1 sm:gap-[2px]">
            {renderSegment(otBooks, 0)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[0.7rem] text-[var(--text-secondary)] tabular-nums sm:hidden">
            <span>Old Testament</span>
            <span>39 books, 929 ch</span>
          </div>
        </div>
        <div className="hidden w-px shrink-0 bg-[var(--border-strong)] sm:block" aria-hidden="true" />
        <div className="spine-segment-nt min-w-0">
          <div className="flex min-w-0 items-stretch gap-px pt-1 sm:gap-[2px]">
            {renderSegment(ntBooks, otBooks.length)}
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

      {/* 8-Division Mineral Pigment Key (tappable on mobile to spotlight division spines) */}
      <div
        className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--border-subtle)]/70 pt-3 text-[0.72rem] text-[var(--text-secondary)] sm:gap-x-3 sm:gap-y-1.5"
        aria-label="Biblical divisions legend"
      >
        {divisionStats.map(({ div, read, total }) => {
          const isPinned = pinnedDivision === div.id;
          const isHighlighted = activeDivision === div.id;
          return (
            <motion.button
              key={div.id}
              type="button"
              whileTap={TACTILE_PILL_TAP}
              aria-pressed={isPinned}
              onClick={() => setPinnedDivision((prev) => (prev === div.id ? null : div.id))}
              onMouseEnter={() => setHoveredDivision(div.id)}
              onMouseLeave={() => setHoveredDivision(null)}
              className={`inline-flex min-h-7 items-center gap-1.5 rounded-md px-2 py-0.5 transition-colors sm:min-h-0 sm:px-1.5 ${
                isPinned
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] ring-1 ring-[var(--border-strong)]'
                  : isHighlighted
                    ? 'text-[var(--text-primary)]'
                    : 'hover:text-[var(--text-primary)]'
              }`}
            >
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: div.colorVar }}
              />
              <span>{div.shortLabel}</span>
              <span className="tabular-nums opacity-75">
                {read}/{total}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
