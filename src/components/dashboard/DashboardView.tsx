import React, { useMemo } from 'react';
import { Award, BookOpen, CalendarCheck, Flame, TrendingUp } from 'lucide-react';
import { BIBLE_BOOKS, BOOKS_BY_ID, DIVISION_META_BY_ID } from '../../data/bibleCanon';
import { formatPlainDate } from '../../lib/dates';
import { formatChapterRanges } from '../../lib/progress';
import { useBibleStore } from '../../store/useBibleStore';
import type { AchievementStatus } from '../../types/bible';
import { MedallionIcon } from '../achievements/MedallionIcon';
import { SanctuaryLamp } from '../ui/SanctuaryLamp';
import { CanonicalSpineBar } from './CanonicalSpineBar';
import { QuickLogCard } from './QuickLogCard';
import { ReadingHeatmap } from './ReadingHeatmap';

interface DashboardViewProps {
  onOpenBook: (bookId: string) => void;
  onInspectAchievement: (achievement: AchievementStatus) => void;
  onNavigateTab: (tab: 'library' | 'achievements' | 'journal') => void;
}

function formatPercent(read: number, total: number): string {
  if (total <= 0) return '0%';
  const pct = (read / total) * 100;
  return `${pct.toFixed(pct > 0 && pct < 10 ? 1 : 0)}%`;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenBook,
  onInspectAchievement,
  onNavigateTab,
}) => {
  const { summary, achievements, logs, preferences, activateDemoJourney } = useBibleStore();

  const inProgressBooks = useMemo(
    () =>
      BIBLE_BOOKS.map((b) => summary.bookProgressById[b.id])
        .filter((bp) => bp && bp.readChapters > 0 && !bp.completed)
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 4),
    [summary.bookProgressById]
  );

  const closestAchievement = useMemo(() => {
    return (
      achievements
        .filter((a) => !a.unlocked && !a.definition.secret)
        .sort((a, b) => b.percentage - a.percentage)[0] ?? null
    );
  }, [achievements]);

  const recentLogs = useMemo(
    () =>
      [...logs]
        .sort((a, b) => b.readDate.localeCompare(a.readDate) || b.loggedAt.localeCompare(a.loggedAt))
        .slice(0, 4),
    [logs]
  );

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-10">
      {/* First-time Opening Strip (Editorial, unboxed, calm) */}
      {logs.length === 0 && (
        <section className="border-b border-[var(--border-subtle)] pb-7">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-[60ch]">
              <h2 className="font-display text-2xl font-medium tracking-tight text-[var(--text-primary)] sm:text-[1.75rem]">
                A quiet ledger for daily Scripture reading
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
                Record chapters across all 66 books, trace your rhythm across the year, and keep
                private study notes synced to your account or saved directly in your browser.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onOpenBook('john')}
                className="btn-primary inline-flex min-h-10 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                <span>Start in John</span>
              </button>
              <button
                type="button"
                onClick={() => void activateDemoJourney()}
                className="inline-flex min-h-10 items-center rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface)]"
              >
                Preview Sample Journey
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Canonical Progress Ledger + Signature 66-Book Proportional Bar */}
      <section aria-labelledby="overview-heading" className="folio-sheet p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
          <div>
            <h1
              id="overview-heading"
              className="font-display text-3xl font-medium tracking-tight text-[var(--text-primary)] sm:text-[2.15rem]"
            >
              Canonical Journey
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)] tabular-nums">
              {summary.booksCompleted} of 66 books completed, {summary.booksInProgress} in progress
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('library')}
            className="text-sm font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
          >
            Explore 66 books
          </button>
        </div>

        {/* Typographic Ledger Metrics (no nested SaaS cards) */}
        <div className="grid divide-y divide-[var(--border-subtle)] border-b border-[var(--border-subtle)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="py-5 sm:pr-6">
            <p className="text-xs font-medium text-[var(--text-secondary)]">Whole Bible</p>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="font-display text-3xl font-medium tracking-tight tabular-nums text-[var(--text-primary)] sm:text-4xl">
                {formatPercent(summary.totalChaptersRead, summary.totalChapters)}
              </span>
              <span className="text-sm text-[var(--text-secondary)] tabular-nums">
                {summary.totalChaptersRead.toLocaleString()} / {summary.totalChapters.toLocaleString()} ch
              </span>
            </div>
          </div>

          <div className="py-5 sm:px-6">
            <p className="text-xs font-medium text-[var(--text-secondary)]">Old Testament</p>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="font-display text-3xl font-medium tracking-tight tabular-nums text-[var(--text-primary)] sm:text-4xl">
                {formatPercent(summary.otChaptersRead, summary.otTotalChapters)}
              </span>
              <span className="text-sm text-[var(--text-secondary)] tabular-nums">
                {summary.otChaptersRead.toLocaleString()} / {summary.otTotalChapters.toLocaleString()} ch
              </span>
            </div>
          </div>

          <div className="py-5 sm:pl-6">
            <p className="text-xs font-medium text-[var(--text-secondary)]">New Testament</p>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="font-display text-3xl font-medium tracking-tight tabular-nums text-[var(--text-primary)] sm:text-4xl">
                {formatPercent(summary.ntChaptersRead, summary.ntTotalChapters)}
              </span>
              <span className="text-sm text-[var(--text-secondary)] tabular-nums">
                {summary.ntChaptersRead.toLocaleString()} / {summary.ntTotalChapters.toLocaleString()} ch
              </span>
            </div>
          </div>
        </div>

        {/* 66-Book Proportional Spine Bar */}
        <CanonicalSpineBar onOpenBook={onOpenBook} />
      </section>

      {/* Asymmetrical Reading Desk: Log Sheet (7) + Rhythm & Active Rail (5) */}
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <QuickLogCard onOpenBook={onOpenBook} />
        </div>

        <aside className="space-y-6 lg:col-span-5" aria-label="Reading rhythm and active books">
          {/* Streak & Pace Ledger */}
          <section className="folio-sheet p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-medium text-[var(--text-primary)]">
                  Reading Rhythm
                </h2>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-medium tabular-nums text-[var(--text-primary)]">
                    {summary.currentStreak}
                  </span>
                  <span className="text-sm text-[var(--text-secondary)]">
                    {summary.currentStreak === 1 ? 'day streak' : 'days streak'}
                  </span>
                </div>
              </div>
              <SanctuaryLamp active={summary.currentStreak > 0} size={42} />
            </div>

            <div className="mt-4 grid grid-cols-2 divide-x divide-[var(--border-subtle)] border-y border-[var(--border-subtle)] py-3 text-xs">
              <div className="pr-3">
                <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <Flame className="h-3.5 w-3.5 text-[var(--color-lamp)]" aria-hidden="true" />
                  Best streak
                </span>
                <p className="mt-1 font-display text-lg font-medium tabular-nums text-[var(--text-primary)]">
                  {summary.longestStreak} days
                </p>
              </div>
              <div className="pl-4">
                <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <TrendingUp className="h-3.5 w-3.5 text-[var(--color-sage)]" aria-hidden="true" />
                  Weekly pace
                </span>
                <p className="mt-1 font-display text-lg font-medium tabular-nums text-[var(--text-primary)]">
                  {summary.chaptersPerWeekAvg} ch/wk
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {preferences.streakGraceEnabled
                  ? summary.graceUsedThisWeek
                    ? 'Sabbath grace active this week'
                    : '1 rest day per week grace enabled'
                  : 'Strict daily streak mode'}
              </span>
              {summary.projectedFinishDate ? (
                <span className="tabular-nums">
                  Est. finish {formatPlainDate(summary.projectedFinishDate, { month: 'short', year: 'numeric' })}
                </span>
              ) : null}
            </div>
          </section>

          {/* Closest Seal Spotlight */}
          {closestAchievement ? (
            <button
              type="button"
              onClick={() => onInspectAchievement(closestAchievement)}
              className="folio-sheet flex w-full items-center gap-4 p-4 text-left transition-colors hover:border-[var(--border-strong)]"
            >
              <MedallionIcon
                motif={closestAchievement.definition.motif}
                tier={closestAchievement.definition.tier}
                unlocked={false}
                size={48}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent)]">
                    <Award className="h-3.5 w-3.5" aria-hidden="true" />
                    Next seal
                  </span>
                  <span className="text-xs font-medium tabular-nums text-[var(--text-secondary)]">
                    {closestAchievement.current}/{closestAchievement.target}
                  </span>
                </div>
                <p className="truncate font-display text-base font-medium text-[var(--text-primary)]">
                  {closestAchievement.definition.title}
                </p>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-accent)]"
                    style={{ width: `${closestAchievement.percentage}%` }}
                  />
                </div>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigateTab('achievements')}
              className="folio-sheet flex w-full items-center justify-between p-4 text-left transition-colors hover:border-[var(--border-strong)]"
            >
              <div>
                <p className="text-xs font-medium text-[var(--color-accent)]">Hall of Seals</p>
                <p className="font-display text-lg font-medium text-[var(--text-primary)]">
                  {unlockedCount} of {achievements.length} unlocked
                </p>
              </div>
              <span className="text-xs font-medium text-[var(--text-secondary)]">View all</span>
            </button>
          )}

          {/* In Progress Books & Recent Sessions */}
          <section className="folio-sheet p-5 sm:p-6" aria-labelledby="active-books-heading">
            <div className="flex items-baseline justify-between gap-2">
              <h2
                id="active-books-heading"
                className="font-display text-xl font-medium text-[var(--text-primary)]"
              >
                In Progress
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('journal')}
                className="text-xs font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
              >
                View journal
              </button>
            </div>

            {inProgressBooks.length === 0 ? (
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                Open any book from the Library or log a chapter to track books currently underway.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                {inProgressBooks.map((bp) => {
                  const divMeta = DIVISION_META_BY_ID[bp.book.division];
                  return (
                    <li key={bp.book.id}>
                      <button
                        type="button"
                        onClick={() => onOpenBook(bp.book.id)}
                        className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-[var(--bg-surface)]"
                      >
                        <span
                          className="h-7 w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: divMeta.colorVar }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate font-display text-base font-medium text-[var(--text-primary)]">
                              {bp.book.name}
                            </span>
                            <span className="text-xs font-medium tabular-nums text-[var(--text-secondary)]">
                              {bp.readChapters}/{bp.totalChapters}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${bp.percentage}%`,
                                backgroundColor: divMeta.colorVar,
                              }}
                            />
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {recentLogs.length > 0 && (
              <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
                <h3 className="text-xs font-medium text-[var(--text-secondary)]">
                  Recent sessions
                </h3>
                <ul className="mt-2.5 space-y-2">
                  {recentLogs.map((log) => {
                    const book = BOOKS_BY_ID[log.bookId];
                    if (!book) return null;
                    return (
                      <li
                        key={log.id}
                        className="flex items-baseline justify-between gap-2 text-xs text-[var(--text-secondary)]"
                      >
                        <button
                          type="button"
                          onClick={() => onOpenBook(book.id)}
                          className="truncate font-medium text-[var(--text-primary)] hover:text-[var(--color-accent)] hover:underline"
                        >
                          {book.name} {formatChapterRanges(log.chapters)}
                        </button>
                        <span className="shrink-0 tabular-nums">
                          {formatPlainDate(log.readDate, { month: 'short', day: 'numeric' })}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* 52-Week Heatmap */}
      <ReadingHeatmap />
    </div>
  );
};
