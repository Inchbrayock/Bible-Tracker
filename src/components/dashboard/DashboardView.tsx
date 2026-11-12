import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarCheck,
  Flame,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { BIBLE_BOOKS, BOOKS_BY_ID, DIVISION_META_BY_ID } from '../../data/bibleCanon';
import { formatPlainDate } from '../../lib/dates';
import { formatChapterRanges } from '../../lib/progress';
import { useBibleStore } from '../../store/useBibleStore';
import type { AchievementStatus } from '../../types/bible';
import { MedallionIcon } from '../achievements/MedallionIcon';
import { ProgressRing } from '../ui/ProgressRing';
import { SanctuaryLamp } from '../ui/SanctuaryLamp';
import { QuickLogCard } from './QuickLogCard';
import { ReadingHeatmap } from './ReadingHeatmap';

interface DashboardViewProps {
  onOpenBook: (bookId: string) => void;
  onInspectAchievement: (achievement: AchievementStatus) => void;
  onNavigateTab: (tab: 'library' | 'achievements' | 'journal') => void;
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
    return achievements
      .filter((a) => !a.unlocked && !a.definition.secret)
      .sort((a, b) => b.percentage - a.percentage)[0] ?? null;
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
    <div className="space-y-6">
      {/* First-time welcome banner when empty */}
      {logs.length === 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="sanctuary-card relative overflow-hidden p-6 sm:p-8"
        >
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Welcome to Selah</span>
              </span>
              <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                An Illuminated Sanctuary for Daily Scripture Reading
              </h1>
              <p className="mt-2.5 text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
                Track every chapter across all 66 books of the Bible, build a peaceful daily rhythm,
                record reflections, and collect illuminated seals along the way. Everything stays
                privately stored right in your browser.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onOpenBook('john')}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                <span>Start Reading</span>
              </button>
              <button
                type="button"
                onClick={() => void activateDemoJourney()}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              >
                <Sparkles className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                <span>Preview Sample Journey</span>
              </button>
            </div>
          </div>
        </motion.section>
      )}

      {/* Hero Stats & Progress Rings */}
      <section aria-labelledby="overview-heading" className="grid gap-5 lg:grid-cols-12">
        <div className="sanctuary-card p-6 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1
                id="overview-heading"
                className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl"
              >
                Canonical Journey
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                {summary.booksCompleted} of 66 books completed · {summary.booksInProgress} in
                progress
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('library')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-accent)] hover:underline"
            >
              <span>Explore 66 Books</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="flex flex-col items-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <ProgressRing
                value={summary.totalChaptersRead}
                max={summary.totalChapters}
                label="Whole Bible"
                sublabel="Canon"
              />
              <span className="mt-3 font-display text-base font-semibold text-[var(--text-primary)]">
                Whole Bible
              </span>
            </div>

            <div className="flex flex-col items-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <ProgressRing
                value={summary.otChaptersRead}
                max={summary.otTotalChapters}
                label="Old Testament"
                sublabel="39 Books"
                accentColor="var(--div-pentateuch)"
                secondaryColor="var(--div-wisdom)"
              />
              <span className="mt-3 font-display text-base font-semibold text-[var(--text-primary)]">
                Old Testament
              </span>
            </div>

            <div className="flex flex-col items-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <ProgressRing
                value={summary.ntChaptersRead}
                max={summary.ntTotalChapters}
                label="New Testament"
                sublabel="27 Books"
                accentColor="var(--div-gospels)"
                secondaryColor="var(--color-accent)"
              />
              <span className="mt-3 font-display text-base font-semibold text-[var(--text-primary)]">
                New Testament
              </span>
            </div>
          </div>
        </div>

        {/* Streak Lamp & Pace Column */}
        <div className="flex flex-col gap-5 lg:col-span-4">
          <div className="sanctuary-card flex-1 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Reading Rhythm
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-semibold tabular-nums text-[var(--text-primary)]">
                    {summary.currentStreak}
                  </span>
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    {summary.currentStreak === 1 ? 'day streak' : 'days streak'}
                  </span>
                </div>
              </div>
              <SanctuaryLamp active={summary.currentStreak > 0} size={46} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-[var(--bg-surface)] p-3">
                <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                  <Flame className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden="true" />
                  Best Streak
                </span>
                <p className="mt-1 font-display text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                  {summary.longestStreak} days
                </p>
              </div>
              <div className="rounded-xl bg-[var(--bg-surface)] p-3">
                <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                  <TrendingUp className="h-3.5 w-3.5 text-[var(--color-sage)]" aria-hidden="true" />
                  Weekly Pace
                </span>
                <p className="mt-1 font-display text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                  {summary.chaptersPerWeekAvg} ch/wk
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1">
                <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {preferences.streakGraceEnabled
                  ? summary.graceUsedThisWeek
                    ? 'Sabbath grace active this week'
                    : '1 rest day/wk grace enabled'
                  : 'Strict daily streak mode'}
              </span>
              {summary.projectedFinishDate ? (
                <span className="tabular-nums">
                  Est. finish: {formatPlainDate(summary.projectedFinishDate, { month: 'short', year: 'numeric' })}
                </span>
              ) : null}
            </div>
          </div>

          {/* Closest Achievement Spotlight */}
          {closestAchievement ? (
            <button
              type="button"
              onClick={() => onInspectAchievement(closestAchievement)}
              className="sanctuary-card sheen-overlay flex items-center gap-3.5 p-4 text-left transition-transform hover:-translate-y-0.5"
            >
              <MedallionIcon
                motif={closestAchievement.definition.motif}
                tier={closestAchievement.definition.tier}
                unlocked={false}
                size={54}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[0.68rem] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                    <Award className="h-3 w-3" aria-hidden="true" />
                    Next Seal
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-[var(--text-secondary)]">
                    {closestAchievement.current}/{closestAchievement.target}
                  </span>
                </div>
                <p className="truncate font-display text-base font-semibold text-[var(--text-primary)]">
                  {closestAchievement.definition.title}
                </p>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
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
              className="sanctuary-card flex items-center justify-between p-4 text-left"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  Hall of Seals
                </p>
                <p className="font-display text-lg font-semibold text-[var(--text-primary)]">
                  {unlockedCount} / {achievements.length} Unlocked
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-[var(--text-secondary)]" aria-hidden="true" />
            </button>
          )}
        </div>
      </section>

      {/* Quick Log + Active Books */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <QuickLogCard onOpenBook={onOpenBook} />
        </div>

        <section className="sanctuary-card p-5 sm:p-6 lg:col-span-5" aria-labelledby="active-books-heading">
          <div className="flex items-center justify-between">
            <h2
              id="active-books-heading"
              className="font-display text-xl font-semibold text-[var(--text-primary)]"
            >
              In Progress
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('journal')}
              className="text-xs font-semibold text-[var(--color-accent)] hover:underline"
            >
              View Journal
            </button>
          </div>

          {inProgressBooks.length === 0 ? (
            <p className="mt-4 rounded-xl bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
              Open any book from the Library or log your first chapter to track active books here.
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {inProgressBooks.map((bp) => {
                const divMeta = DIVISION_META_BY_ID[bp.book.division];
                return (
                  <li key={bp.book.id}>
                    <button
                      type="button"
                      onClick={() => onOpenBook(bp.book.id)}
                      className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-left transition-colors hover:border-[var(--border-strong)]"
                    >
                      <span
                        className="h-8 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: divMeta.colorVar }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-display text-base font-semibold text-[var(--text-primary)]">
                            {bp.book.name}
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-[var(--text-secondary)]">
                            {bp.readChapters}/{bp.totalChapters}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
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
            <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Recent Sessions
              </h3>
              <ul className="mt-2.5 space-y-2">
                {recentLogs.map((log) => {
                  const book = BOOKS_BY_ID[log.bookId];
                  if (!book) return null;
                  return (
                    <li
                      key={log.id}
                      className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]"
                    >
                      <span className="truncate font-medium text-[var(--text-primary)]">
                        {book.name} {formatChapterRanges(log.chapters)}
                      </span>
                      <span className="shrink-0 tabular-nums">{formatPlainDate(log.readDate, { month: 'short', day: 'numeric' })}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* 52-Week Heatmap */}
      <ReadingHeatmap />
    </div>
  );
};
