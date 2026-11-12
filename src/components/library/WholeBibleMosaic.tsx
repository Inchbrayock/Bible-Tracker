import React, { useState } from 'react';
import { BIBLE_BOOKS, DIVISION_META_BY_ID } from '../../data/bibleCanon';
import { useBibleStore } from '../../store/useBibleStore';

interface WholeBibleMosaicProps {
  onSelectBook: (bookId: string) => void;
}

export const WholeBibleMosaic: React.FC<WholeBibleMosaicProps> = ({ onSelectBook }) => {
  const { summary } = useBibleStore();
  const [hovered, setHovered] = useState<{
    bookName: string;
    chapter: number;
    readCount: number;
  } | null>(null);

  const otBooks = BIBLE_BOOKS.filter((b) => b.testament === 'OT');
  const ntBooks = BIBLE_BOOKS.filter((b) => b.testament === 'NT');

  const renderGroup = (title: string, subtitle: string, books: typeof BIBLE_BOOKS) => (
    <div>
      <div className="flex items-baseline justify-between border-b border-[var(--border-subtle)] pb-2">
        <h3 className="font-display text-xl font-medium text-[var(--text-primary)]">{title}</h3>
        <span className="text-xs text-[var(--text-secondary)] tabular-nums">{subtitle}</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => {
          const bp = summary.bookProgressById[book.id];
          const divMeta = DIVISION_META_BY_ID[book.division];
          const readCountTotal = bp?.readChapters ?? 0;
          return (
            <button
              key={book.id}
              type="button"
              onClick={() => onSelectBook(book.id)}
              onMouseLeave={() => setHovered(null)}
              aria-label={`Open ${book.name}: ${readCountTotal} of ${book.chapterCount} chapters read`}
              className="group rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5 text-left transition-colors hover:border-[var(--border-strong)]"
            >
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="font-display text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--color-accent)]">
                  {book.name}
                </span>
                <span className="text-xs tabular-nums text-[var(--text-secondary)]">
                  {readCountTotal}/{book.chapterCount}
                </span>
              </div>
              <div className="flex flex-wrap gap-[3px]">
                {Array.from({ length: book.chapterCount }, (_, idx) => {
                  const ch = idx + 1;
                  const state = bp?.chapterMap[ch];
                  const readCount = state?.readCount ?? 0;
                  let bg = 'var(--bg-subtle)';
                  if (readCount === 1) {
                    bg = divMeta.colorVar;
                  } else if (readCount >= 2) {
                    bg = 'var(--color-lamp)';
                  }
                  return (
                    <span
                      key={ch}
                      aria-hidden="true"
                      onMouseEnter={() =>
                        setHovered({ bookName: book.name, chapter: ch, readCount })
                      }
                      className={`h-2.5 w-2.5 rounded-[1.5px] sm:h-[9px] sm:w-[9px] ${
                        readCount > 0 ? 'chapter-tile-read' : ''
                      }`}
                      style={{ backgroundColor: bg }}
                    />
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <section className="folio-sheet p-4 sm:p-7" aria-labelledby="mosaic-heading">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h2
            id="mosaic-heading"
            className="font-display text-2xl font-medium text-[var(--text-primary)]"
          >
            The 1,189-Chapter Codex Map
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Every square represents one chapter. Select any book to open its chapter grid.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[1.5px] bg-[var(--bg-subtle)]" />
            Unread
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[1.5px] bg-[var(--color-accent)]" />
            Read (division hue)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[1.5px] bg-[var(--color-lamp)]" />
            Re-read 2×+
          </span>
        </div>
      </div>

      <div className="mt-4 hidden min-h-5 text-xs font-medium text-[var(--text-secondary)] sm:block">
        {hovered ? (
          <span>
            <strong className="font-semibold text-[var(--text-primary)]">
              {hovered.bookName} {hovered.chapter}
            </strong>{' '}
            — {hovered.readCount === 0 ? 'Unread' : `Read ${hovered.readCount}×`}
          </span>
        ) : (
          <span>Hover any chapter square to inspect status, or select a book to log chapters.</span>
        )}
      </div>

      <div className="mt-5 space-y-10">
        {renderGroup('Old Testament', '929 chapters', otBooks)}
        {renderGroup('New Testament', '260 chapters', ntBooks)}
      </div>
    </section>
  );
};
