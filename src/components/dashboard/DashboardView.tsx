import React, { useMemo } from 'react';
import { Award, BookOpen, CalendarCheck, Flame, TrendingUp } from 'lucide-react';
import { BOOKS_BY_ID, DIVISION_META_BY_ID } from '../../data/bibleCanon';
import { formatPlainDate } from '../../lib/dates';
import { formatChapterRanges } from '../../lib/progress';
import { useBibleStore } from '../../store/useBibleStore';
import type { AchievementStatus } from '../../types/bible';
import { MedallionIcon } from '../achievements/MedallionIcon';
import { SanctuaryLamp } from '../ui/SanctuaryLamp';
import { CanonicalSpineBar } from './CanonicalSpineBar';
import { ContinueReadingCard } from './ContinueReadingCard';
import { QuickLogCard } from './QuickLogCard';
import { ReadingHeatmap } from './ReadingHeatmap';

interface DashboardViewProps {
  onOpenBook: (bookId: string) => void;
  onInspectAchievement: (achievement: AchievementStatus) => void;
  onNavigateTab: (
    tab: 'library' | 'achievements' | 'journal',
    options?: { journalSubTab?: 'journal' | 'plans' }
  ) => void;
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
    <div className="space-y-6 sm:space-y-8">
      {/* First-time Opening Strip (Editorial, unboxed, calm) */}
      {logs.length === 0 && (
        <section className="border-b border-[var(--border-subtle)] pb-6 sm:pb-7">
          <div className="flex flex-col justify-between gap-4 sm:gap-5 lg:flex-row lg:items-end">
            <div className="max-w-[60ch]">
              <h2 className="font-display text-2xl font-medium tracking-tight text-[var(--text-primary)] sm:text-[1.75rem]">
                A quiet ledger for daily Scripture reading
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
                Record chapters across all 66 books, trace your rhythm across the year, and keep
                private study notes synced to your account or saved directly in your browser.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
              <button
                type="button"
                onClick={() => onOpenBook('john')}
                className="btn-primary inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 sm:min-h-10 sm:w-auto"
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                <span>Start in John</span>
              </button>
              <button
                type="button"
                onClick={() => void activateDemoJourney()}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface)] sm:min-h-10 sm:w-auto"
              >
                Preview Sample Journey
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Band 1: Canonical Progress Ledger + Signature 66-Book Proportional Bar */}
      <section aria-labelledby="overview-heading" className="folio-sheet p-4 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--border-subtle)] pb-4 sm:gap-4 sm:pb-5">
          <div>
            <h1
              id="overview-heading"
              className="font-display text-2xl font-medium tracking-tight text-[var(--text-primary)] sm:text-[2.15rem]"
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
            className="inline-flex min-h-9 items-center text-sm font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
          >
            Explore 66 books
          </button>
        </div>

        {/* Typographic Ledger Metrics */}
        <div className="grid grid-cols-2 border-b border-[var(--border-subtle)] sm:grid-cols-3 sm:divide-x sm:divide-[var(--border-subtle)]">
          <div className="col-span-2 border-b border-[var(--border-subtle)] py-4 sm:col-span-1 sm:border-b-0 sm:py-5 sm:pr-6">
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

          <div className="border-r border-[var(--border-subtle)] py-4 pr-3 sm:border-r-0 sm:px-6 sm:py-5">
            <p className="text-xs font-medium text-[var(--text-secondary)]">Old Testament</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <span className="font-display text-2xl font-medium tracking-tight tabular-nums text-[var(--text-primary)] sm:text-4xl">
                {formatPercent(summary.otChaptersRead, summary.otTotalChapters)}
              </span>
              <span className="text-xs text-[var(--text-secondary)] tabular-nums sm:text-sm">
                {summary.otChaptersRead.toLocaleString()} / {summary.otTotalChapters.toLocaleString()} ch
              </span>
            </div>
          </div>

          <div className="py-4 pl-3 sm:py-5 sm:pl-6">
            <p className="text-xs font-medium text-[var(--text-secondary)]">New Testament</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <span className="font-display text-2xl font-medium tracking-tight tabular-nums text-[var(--text-primary)] sm:text-4xl">
                {formatPercent(summary.ntChaptersRead, summary.ntTotalChapters)}
              </span>
              <span className="text-xs text-[var(--text-secondary)] tabular-nums sm:text-sm">
                {summary.ntChaptersRead.toLocaleString()} / {summary.ntTotalChapters.toLocaleString()} ch
              </span>
            </div>
          </div>
        </div>

        {/* 66-Book Proportional Spine Bar & 8-Division Key */}
        <CanonicalSpineBar onOpenBook={onOpenBook} />
      </section>

      {/* Band 2: Reading Desk — Log a Reading (7) paired with Rhythm & Next Seal (5) */}
      <div className="grid gap-6 sm:gap-8 lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-7">
          <QuickLogCard onOpenBook={onOpenBook} />
        </div>

        <aside
          className="flex flex-col gap-5 sm:gap-6 lg:col-span-5"
          aria-label="Reading rhythm and next seal"
        >
          {/* Streak & Pace Ledger */}
          <section className="folio-sheet flex flex-1 flex-col justify-between p-4 sm:p-6">
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
                  {summary.longestStreak} {summary.longestStreak === 1 ? 'day' : 'days'}
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
                  Est. finish{' '}
                  {formatPlainDate(summary.projectedFinishDate, { month: 'short', year: 'numeric' })}
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
        </aside>
      </div>

      {/* Band 3: Continue Reading & Active Plan (7) paired with Recent Sessions (5) */}
      <div className="grid gap-6 sm:gap-8 lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-7">
          <ContinueReadingCard
            onOpenBook={onOpenBook}
            onBrowseLibrary={() => onNavigateTab('library')}
            onOpenPlans={() => onNavigateTab('journal', { journalSubTab: 'plans' })}
          />
        </div>

        <section
          className="folio-sheet flex h-full flex-col justify-between p-4 sm:p-6 lg:col-span-5"
          aria-labelledby="recent-sessions-heading"
        >
          <div>
            <div className="flex items-baseline justify-between gap-2 border-b border-[var(--border-subtle)] pb-3.5">
              <h2
                id="recent-sessions-heading"
                className="font-display text-xl font-medium text-[var(--text-primary)]"
              >
                Recent Sessions
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('journal')}
                className="inline-flex min-h-9 items-center text-xs font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
              >
                View journal
              </button>
            </div>

            {recentLogs.length === 0 ? (
              <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                Your logged chapters and reflections will gather here as you read.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-[var(--border-subtle)]/70">
                {recentLogs.map((log) => {
                  const book = BOOKS_BY_ID[log.bookId];
                  if (!book) return null;
                  const divMeta = DIVISION_META_BY_ID[book.division];
                  return (
                    <li key={log.id}>
                      <button
                        type="button"
                        onClick={() => onOpenBook(book.id)}
                        className="group -mx-2 flex w-[calc(100%+1rem)] items-start gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-[var(--bg-surface)]/70"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-1 h-4 w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: divMeta.colorVar }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="truncate text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--color-accent)]">
                              {book.name} {formatChapterRanges(log.chapters)}
                            </span>
                            <span className="shrink-0 text-xs text-[var(--text-secondary)] tabular-nums">
                              {formatPlainDate(log.readDate, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          {log.note ? (
                            <p className="mt-0.5 line-clamp-1 font-display text-xs italic text-[var(--text-secondary)]">
                              “{log.note}”
                            </p>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-xs text-[var(--text-secondary)] tabular-nums">
            <span>
              {summary.totalSessions} {summary.totalSessions === 1 ? 'session' : 'sessions'} recorded
            </span>
            <span>
              {summary.notesCount} {summary.notesCount === 1 ? 'reflection' : 'reflections'}
            </span>
          </div>
        </section>
      </div>

      {/* Band 4: 52-Week Heatmap */}
      <ReadingHeatmap />
    </div>
  );
};
