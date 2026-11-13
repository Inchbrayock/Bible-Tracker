import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Compass, Plus, ScrollText, Search, X } from 'lucide-react';
import { BOOKS_BY_ID } from '../../data/bibleCanon';
import { todayPlainDate } from '../../lib/dates';
import {
  computeJournalStats,
  filterJournalLogs,
  groupLogsByMonth,
  type JournalLens,
} from '../../lib/journal';
import { indexReadingLogForSearch } from '../../lib/logSearch';
import { FOLIO_EASE, SPRING_TACTILE, TACTILE_PILL_TAP, TACTILE_TAP } from '../../lib/motion';
import { useBibleStore } from '../../store/useBibleStore';
import type { BibleDivision } from '../../types/bible';
import { JournalComposer } from './JournalComposer';
import { JournalEntryRow } from './JournalEntryRow';
import { PlansView } from './PlansView';

interface JournalViewProps {
  onOpenBook: (bookId: string) => void;
  initialSubTab?: 'journal' | 'plans';
}

export const JournalView: React.FC<JournalViewProps> = ({
  onOpenBook,
  initialSubTab = 'journal',
}) => {
  const { logs, editLog, removeLog, activateReadingPlan } = useBibleStore();
  const [subTab, setSubTab] = useState<'journal' | 'plans'>(initialSubTab);
  const [search, setSearch] = useState('');
  const [lens, setLens] = useState<JournalLens>('all');
  const [division, setDivision] = useState<'ALL' | BibleDivision>('ALL');
  const [composerOpen, setComposerOpen] = useState(false);

  const todayIso = todayPlainDate();

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const indexedLogs = useMemo(() => {
    return [...logs]
      .filter((log) => Boolean(BOOKS_BY_ID[log.bookId]))
      .sort((a, b) => b.readDate.localeCompare(a.readDate) || b.loggedAt.localeCompare(a.loggedAt))
      .map((log) => indexReadingLogForSearch(log, BOOKS_BY_ID[log.bookId]));
  }, [logs]);

  const stats = useMemo(
    () => computeJournalStats(indexedLogs.map((entry) => entry.log)),
    [indexedLogs]
  );

  // Reset division filter if logs change and that division no longer exists
  const activeDivision: 'ALL' | BibleDivision =
    division === 'ALL' || stats.divisionsPresent.some((d) => d.id === division)
      ? division
      : 'ALL';

  const filteredLogs = useMemo(
    () =>
      filterJournalLogs(indexedLogs, {
        query: search,
        lens,
        division: activeDivision,
      }),
    [indexedLogs, search, lens, activeDivision]
  );

  const monthGroups = useMemo(() => groupLogsByMonth(filteredLogs), [filteredLogs]);

  const hasActiveFilters = Boolean(search.trim() || lens !== 'all' || activeDivision !== 'ALL');

  const resetFilters = () => {
    setSearch('');
    setLens('all');
    setDivision('ALL');
  };

  const handleOpenPlanFromLog = (planId: string) => {
    void activateReadingPlan(planId);
    setSubTab('plans');
  };

  const handleInspectJournalFromPlan = (queryText: string) => {
    setSearch(queryText);
    setLens('reflections');
    setDivision('ALL');
    setSubTab('journal');
  };

  const scrollToMonth = (monthKey: string) => {
    if (typeof document === 'undefined') return;
    const target = document.getElementById(`journal-month-${monthKey}`);
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="border-b border-[var(--border-subtle)] pb-5 sm:pb-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight text-[var(--text-primary)] sm:text-[2.15rem]">
              {subTab === 'journal' ? 'Reading Journal' : 'Guided Reading Plans'}
            </h1>
            <p className="mt-1 max-w-[60ch] text-sm text-[var(--text-secondary)]">
              {subTab === 'journal'
                ? hasActiveFilters
                  ? `Showing ${filteredLogs.length} of ${indexedLogs.length} ${indexedLogs.length === 1 ? 'session' : 'sessions'}.`
                  : 'Chronicle your daily Scripture reading and keep study reflections grouped by month.'
                : 'Follow a structured path or let your free-form reading automatically mark days complete.'}
            </p>
          </div>

          <div className="flex flex-col gap-2.5 sm:items-end">
            <div className="grid w-full grid-cols-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 sm:inline-flex sm:w-auto">
              {(
                [
                  { id: 'journal', label: 'Log History', icon: ScrollText },
                  { id: 'plans', label: 'Reading Plans', icon: Compass },
                ] as const
              ).map((tabOpt) => {
                const Icon = tabOpt.icon;
                const isActive = subTab === tabOpt.id;
                return (
                  <motion.button
                    key={tabOpt.id}
                    type="button"
                    whileTap={TACTILE_PILL_TAP}
                    onClick={() => setSubTab(tabOpt.id)}
                    aria-pressed={isActive}
                    className={`relative inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[4px] px-3 py-1.5 text-sm font-medium transition-colors sm:min-h-0 ${
                      isActive
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="journal-subtab-pill"
                        transition={SPRING_TACTILE}
                        aria-hidden="true"
                        className="absolute inset-0 rounded-[4px] bg-[var(--bg-elevated)] shadow-2xs"
                      />
                    )}
                    <span className="relative z-10 inline-flex items-center gap-1.5">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span>{tabOpt.label}</span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {subTab === 'journal' && (
            <motion.div
              key="journal-controls-wrap"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: FOLIO_EASE }}
              className="overflow-hidden"
            >
              <div className="mt-5 space-y-3.5 sm:mt-6">
                {/* Summary Ledger + Record Entry CTA */}
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] sm:inline-grid">
                    <div className="px-3 py-2 text-center sm:px-4">
                      <p className="text-[0.7rem] text-[var(--text-secondary)] sm:text-xs">
                        Sessions
                      </p>
                      <p className="mt-0.5 font-display text-base font-medium tabular-nums text-[var(--text-primary)]">
                        {stats.totalSessions}
                      </p>
                    </div>
                    <div className="px-3 py-2 text-center sm:px-4">
                      <p className="text-[0.7rem] text-[var(--text-secondary)] sm:text-xs">
                        Chapters
                      </p>
                      <p className="mt-0.5 font-display text-base font-medium tabular-nums text-[var(--text-primary)]">
                        {stats.totalChapterReads.toLocaleString()}
                      </p>
                    </div>
                    <div className="px-3 py-2 text-center sm:px-4">
                      <p className="text-[0.7rem] text-[var(--text-secondary)] sm:text-xs">
                        Reflections
                      </p>
                      <p className="mt-0.5 font-display text-base font-medium tabular-nums text-[var(--text-primary)]">
                        {stats.reflectionsCount}
                      </p>
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    whileTap={TACTILE_TAP}
                    transition={SPRING_TACTILE}
                    onClick={() => setComposerOpen((prev) => !prev)}
                    aria-expanded={composerOpen}
                    className="btn-primary inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 sm:min-h-9 sm:py-1.5"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>{composerOpen ? 'Hide composer' : 'Record entry'}</span>
                  </motion.button>
                </div>

                {/* Search + Lens + Division Controls */}
                {indexedLogs.length > 0 && (
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                    <div className="relative w-full sm:min-w-60 sm:flex-1">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
                        aria-hidden="true"
                      />
                      <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape' && search) {
                            e.preventDefault();
                            setSearch('');
                          }
                        }}
                        aria-label="Filter reading journal"
                        placeholder="Search logs by book, chapter, reflection note, or date…"
                        className="folio-input min-h-11 w-full py-2 pl-9 pr-10 text-base placeholder:text-[var(--text-secondary)] sm:min-h-10 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
                      />
                      {search ? (
                        <button
                          type="button"
                          onClick={() => setSearch('')}
                          aria-label="Clear search"
                          className="tactile-press absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>

                    <div
                      className="grid grid-cols-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 text-xs font-medium sm:inline-flex"
                      role="group"
                      aria-label="Filter journal view lens"
                    >
                      {(
                        [
                          { id: 'all', label: 'All entries' },
                          { id: 'reflections', label: 'Reflections' },
                          { id: 'plan-linked', label: 'From plans' },
                        ] as const
                      ).map((opt) => {
                        const isActive = lens === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setLens(opt.id)}
                            aria-pressed={isActive}
                            className={`relative min-h-9 rounded-[4px] px-2.5 py-1.5 whitespace-nowrap transition-colors sm:min-h-0 ${
                              isActive
                                ? 'text-[var(--text-primary)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {isActive && (
                              <motion.span
                                layoutId="journal-lens-pill"
                                transition={SPRING_TACTILE}
                                aria-hidden="true"
                                className="absolute inset-0 rounded-[4px] bg-[var(--bg-elevated)] shadow-2xs"
                              />
                            )}
                            <span className="relative z-10">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {stats.divisionsPresent.length > 1 && (
                      <select
                        aria-label="Filter entries by biblical division"
                        value={activeDivision}
                        onChange={(e) =>
                          setDivision(e.target.value as 'ALL' | BibleDivision)
                        }
                        className="folio-input min-h-10 px-3 py-2 text-base font-medium sm:min-h-0 sm:text-xs"
                      >
                        <option value="ALL">All divisions</option>
                        {stats.divisionsPresent.map((div) => (
                          <option key={div.id} value={div.id}>
                            {div.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {subTab === 'plans' ? (
        <motion.div
          key="plans-panel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: FOLIO_EASE }}
        >
          <PlansView
            onOpenBook={onOpenBook}
            onInspectJournalNotes={handleInspectJournalFromPlan}
          />
        </motion.div>
      ) : (
        <div className="space-y-5 sm:space-y-6">
          <AnimatePresence initial={false}>
            {composerOpen && (
              <JournalComposer
                key="journal-composer"
                onClose={() => setComposerOpen(false)}
              />
            )}
          </AnimatePresence>

          {filteredLogs.length === 0 ? (
            <motion.div
              key="journal-empty"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18, ease: FOLIO_EASE }}
              className="folio-sheet p-8 text-center sm:p-10"
            >
              <p className="font-display text-xl font-medium text-[var(--text-primary)]">
                {indexedLogs.length === 0
                  ? 'Your journal awaits its first entry'
                  : lens === 'reflections' && stats.reflectionsCount === 0 && !search.trim()
                    ? 'No reflection notes written yet'
                    : lens === 'plan-linked' && stats.planLinkedCount === 0 && !search.trim()
                      ? 'No plan-linked entries yet'
                      : 'No matching entries'}
              </p>
              <p className="mx-auto mt-1.5 max-w-[52ch] text-sm text-[var(--text-secondary)]">
                {indexedLogs.length === 0
                  ? 'Record today’s passage and reflection right here, or log chapters from the Sanctuary Dashboard.'
                  : lens === 'reflections' && stats.reflectionsCount === 0 && !search.trim()
                    ? 'Edit any entry or record a new passage with a note to build your commonplace reflections.'
                    : lens === 'plan-linked' && stats.planLinkedCount === 0 && !search.trim()
                      ? 'Entries logged from Reading Plans or tagged with a plan in the composer will gather here.'
                      : 'Try another search term, switch back to All entries, or clear your division filter.'}
              </p>
              {indexedLogs.length === 0 ? (
                <motion.button
                  type="button"
                  whileTap={TACTILE_TAP}
                  onClick={() => setComposerOpen(true)}
                  className="btn-primary mt-5 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Write first entry</span>
                </motion.button>
              ) : hasActiveFilters ? (
                <motion.button
                  type="button"
                  whileTap={TACTILE_TAP}
                  onClick={resetFilters}
                  className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]"
                >
                  {search.trim() ? 'Reset search' : 'Show all entries'}
                </motion.button>
              ) : null}
            </motion.div>
          ) : (
            <div className="space-y-5 sm:space-y-6">
              {/* Month Jump Strip */}
              {monthGroups.length > 1 && (
                <nav
                  aria-label="Jump to journal month"
                  className="-mx-3.5 flex flex-nowrap items-center gap-1.5 overflow-x-auto px-3.5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
                >
                  {monthGroups.map((group) => (
                    <button
                      key={group.monthKey}
                      type="button"
                      onClick={() => scrollToMonth(group.monthKey)}
                      className="tactile-press inline-flex min-h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                    >
                      <span>{group.shortLabel}</span>
                      <span className="tabular-nums text-[0.7rem] opacity-75">
                        {group.sessionCount}
                      </span>
                    </button>
                  ))}
                </nav>
              )}

              {/* Month-Grouped Chronicle Folios */}
              <div className="space-y-6">
                {monthGroups.map((group) => (
                  <section
                    key={group.monthKey}
                    id={`journal-month-${group.monthKey}`}
                    aria-labelledby={`journal-month-heading-${group.monthKey}`}
                    className="space-y-2.5 scroll-mt-24"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
                      <h2
                        id={`journal-month-heading-${group.monthKey}`}
                        className="font-display text-lg font-medium text-[var(--text-primary)] sm:text-xl"
                      >
                        {group.label}
                      </h2>
                      <p className="text-xs tabular-nums text-[var(--text-secondary)]">
                        {group.sessionCount}{' '}
                        {group.sessionCount === 1 ? 'session' : 'sessions'},{' '}
                        {group.chapterCount}{' '}
                        {group.chapterCount === 1 ? 'chapter' : 'chapters'}
                      </p>
                    </div>

                    <ul className="folio-sheet divide-y divide-[var(--border-subtle)] overflow-hidden">
                      {group.logs.map((log) => (
                        <JournalEntryRow
                          key={log.id}
                          log={log}
                          todayIso={todayIso}
                          reflectionFocus={lens === 'reflections'}
                          onOpenBook={onOpenBook}
                          onOpenPlan={handleOpenPlanFromLog}
                          onEditSave={async (id, patch) => {
                            await editLog(id, patch);
                          }}
                          onDelete={async (id) => {
                            await removeLog(id);
                          }}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
