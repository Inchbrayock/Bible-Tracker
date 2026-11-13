import React from 'react';
import { Check, RotateCw } from 'lucide-react';
import { DIVISION_META_BY_ID } from '../../data/bibleCanon';
import type { BookProgress } from '../../types/bible';

interface BookCardProps {
  progress: BookProgress;
  onSelect: (bookId: string) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ progress, onSelect }) => {
  const { book, readChapters, totalChapters, percentage, completed, completedCycles } = progress;
  const division = DIVISION_META_BY_ID[book.division];

  return (
    <button
      type="button"
      onClick={() => onSelect(book.id)}
      aria-label={`${book.name}: ${readChapters} of ${totalChapters} chapters read`}
      className={`folio-sheet tactile-press group relative flex flex-col justify-between overflow-hidden p-4 text-left ${
        completed
          ? 'border-[color-mix(in_oklab,var(--color-sage)_50%,var(--border-subtle))]'
          : 'hover:border-[var(--border-strong)]'
      }`}
    >
      {/* Bookbinding Spine */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 transition-[width] duration-150 group-hover:w-1.5 group-active:w-2"
        style={{ backgroundColor: division.colorVar }}
      />

      <div className="pl-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {division.shortLabel}
            </span>
            <h3 className="mt-0.5 font-display text-lg font-medium leading-snug text-[var(--text-primary)]">
              {book.name}
            </h3>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {completedCycles >= 2 && (
              <span
                title={`Read through ${completedCycles} times`}
                className="inline-flex items-center gap-0.5 rounded bg-[var(--color-lamp-soft)] px-1.5 py-0.5 text-[0.7rem] font-semibold text-[var(--color-lamp)] tabular-nums"
              >
                <RotateCw className="h-2.5 w-2.5" aria-hidden="true" />
                {completedCycles}×
              </span>
            )}
            {completed && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage)]">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            )}
          </div>
        </div>

        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
          {book.theme}
        </p>
      </div>

      <div className="mt-4 pl-2">
        <div className="flex items-center justify-between text-xs tabular-nums">
          <span className={completed ? 'font-medium text-[var(--color-sage)]' : 'text-[var(--text-secondary)]'}>
            {readChapters} / {totalChapters} ch
          </span>
          <span className="text-[var(--text-secondary)]">{Math.round(percentage)}%</span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${percentage}%`,
              backgroundColor: completed ? 'var(--color-sage)' : division.colorVar,
            }}
          />
        </div>
      </div>
    </button>
  );
};
