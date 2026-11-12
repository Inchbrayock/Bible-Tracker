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

  const renderGroup = (title: string, books: typeof BIBLE_BOOKS) => (
    <div>
      <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => {
          const bp = summary.bookProgressById[book.id];
          const divMeta = DIVISION_META_BY_ID[book.division];
          return (
            <div
              key={book.id}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3"
            >
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectBook(book.id)}
                  className="font-display text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--color-accent)] hover:underline"
                >
                  {book.name}
                </button>
                <span className="text-[0.7rem] font-medium tabular-nums text-[var(--text-secondary)]">
                  {bp?.readChapters ?? 0}/{book.chapterCount}
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
                    bg = 'var(--color-accent)';
                  }
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => onSelectBook(book.id)}
                      onMouseEnter={() =>
                        setHovered({ bookName: book.name, chapter: ch, readCount })
                      }
                      onFocus={() =>
                        setHovered({ bookName: book.name, chapter: ch, readCount })
                      }
                      onMouseLeave={() => setHovered(null)}
                      aria-label={`${book.name} chapter ${ch}: ${
                        readCount === 0 ? 'unread' : `read ${readCount} time${readCount > 1 ? 's' : ''}`
                      }`}
                      className={`h-[9px] w-[9px] rounded-[2px] transition-transform hover:scale-150 ${
                        readCount > 0 ? 'chapter-tile-read' : ''
                      }`}
                      style={{ backgroundColor: bg }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <section className="sanctuary-card p-5 sm:p-6" aria-labelledby="mosaic-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="mosaic-heading"
            className="font-display text-xl font-semibold text-[var(--text-primary)]"
          >
            The 1,189-Chapter Illuminated Mosaic
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Every tile represents a single chapter of Scripture. Click any book to open its sheet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-[var(--bg-subtle)] border border-[var(--border-subtle)]" />
            Unread
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-[var(--color-sage)]" />
            Read (division hue)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-[var(--color-accent)]" />
            Re-read 2+×
          </span>
        </div>
      </div>

      <div className="mt-3 min-h-5 text-xs font-medium text-[var(--text-secondary)]">
        {hovered ? (
          <span>
            <strong className="text-[var(--text-primary)]">
              {hovered.bookName} {hovered.chapter}
            </strong>{' '}
            — {hovered.readCount === 0 ? 'Unread' : `Read ${hovered.readCount}×`}
          </span>
        ) : (
          <span>Inspect any chapter tile to preview status.</span>
        )}
      </div>

      <div className="mt-4 space-y-8">
        {renderGroup('Old Testament · 929 Chapters', otBooks)}
        {renderGroup('New Testament · 260 Chapters', ntBooks)}
      </div>
    </section>
  );
};
