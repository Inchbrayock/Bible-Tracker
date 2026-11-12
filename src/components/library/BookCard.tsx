import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, RotateCw } from 'lucide-react';
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
    <motion.button
      type="button"
      layout
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => onSelect(book.id)}
      aria-label={`${book.name}: ${readChapters} of ${totalChapters} chapters read`}
      className={`sanctuary-card group relative flex flex-col justify-between overflow-hidden p-4 text-left transition-colors ${
        completed
          ? 'border-[color-mix(in_oklab,var(--color-sage)_45%,var(--border-subtle))]'
          : 'hover:border-[var(--border-strong)]'
      }`}
    >
      {/* Colored Book Spine Accent */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: division.colorVar }}
      />

      <div className="pl-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {division.shortLabel}
            </span>
            <h3 className="font-display text-lg font-semibold leading-snug text-[var(--text-primary)]">
              {book.name}
            </h3>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {completedCycles >= 2 && (
              <span
                title={`Read through ${completedCycles} times`}
                className="inline-flex items-center gap-0.5 rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-[0.68rem] font-bold text-[var(--color-accent)] tabular-nums"
              >
                <RotateCw className="h-2.5 w-2.5" aria-hidden="true" />
                {completedCycles}×
              </span>
            )}
            {completed && (
              <CheckCircle2
                className="h-5 w-5 text-[var(--color-sage)]"
                aria-hidden="true"
              />
            )}
          </div>
        </div>

        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
          {book.theme}
        </p>
      </div>

      <div className="mt-4 pl-2">
        <div className="flex items-center justify-between text-xs font-medium tabular-nums">
          <span className={completed ? 'font-semibold text-[var(--color-sage)]' : 'text-[var(--text-secondary)]'}>
            {readChapters} / {totalChapters} ch
          </span>
          <span className="text-[var(--text-secondary)]">{Math.round(percentage)}%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
          <motion.div
            className="h-full rounded-full"
            initial={false}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{
              backgroundColor: completed ? 'var(--color-sage)' : division.colorVar,
            }}
          />
        </div>
      </div>
    </motion.button>
  );
};
