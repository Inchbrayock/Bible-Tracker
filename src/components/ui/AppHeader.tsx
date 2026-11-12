import React from 'react';
import { motion } from 'motion/react';
import { Award, BookOpen, Compass, ScrollText, Settings, User } from 'lucide-react';
import { useBibleStore } from '../../store/useBibleStore';
import { SanctuaryLamp } from './SanctuaryLamp';

export type AppTab = 'dashboard' | 'library' | 'achievements' | 'journal';

interface AppHeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
}

const NAV_ITEMS: {
  id: AppTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'Sanctuary', shortLabel: 'Sanctuary', icon: Compass },
  { id: 'library', label: 'Books & Chapters', shortLabel: 'Books', icon: BookOpen },
  { id: 'achievements', label: 'Hall of Seals', shortLabel: 'Seals', icon: Award },
  { id: 'journal', label: 'Journal & Plans', shortLabel: 'Journal', icon: ScrollText },
];

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenSettings,
  onOpenAccount,
}) => {
  const { summary, achievements, user, authLoading, syncStatus } = useBibleStore();
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const accountLabel = user
    ? (user.displayName?.trim().split(/\s+/)[0] ||
        user.email?.split('@')[0] ||
        'Account')
    : 'Sign in';

  const syncDotClass =
    syncStatus === 'synced'
      ? 'bg-[var(--color-sage)]'
      : syncStatus === 'error'
        ? 'bg-[var(--color-crimson)]'
        : 'bg-[var(--color-lamp)]';

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3.5 py-2.5 sm:px-6 lg:gap-4 lg:py-0">
        {/* Wordmark & Live Count */}
        <div className="flex min-w-0 items-center gap-2.5 sm:shrink-0 sm:gap-3 lg:py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] sm:h-9 sm:w-9">
            <SanctuaryLamp active={summary.currentStreak > 0} size={24} />
          </div>
          <div className="flex min-w-0 items-baseline gap-2 sm:gap-3">
            <span className="font-display text-xl font-medium tracking-tight text-[var(--text-primary)] sm:text-2xl">
              Selah
            </span>
            <span className="truncate text-[0.7rem] font-medium text-[var(--text-secondary)] tabular-nums sm:hidden lg:inline xl:hidden">
              {summary.totalChaptersRead.toLocaleString()}/{summary.totalChapters.toLocaleString()}
            </span>
            <span className="hidden text-xs font-medium text-[var(--text-secondary)] tabular-nums sm:inline sm:whitespace-nowrap lg:hidden xl:inline">
              {summary.totalChaptersRead.toLocaleString()} / {summary.totalChapters.toLocaleString()} chapters
            </span>
          </div>
        </div>

        {/* Responsive Editorial Navigation (Bottom dock on < lg, Top inline on lg+) */}
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-subtle)] bg-[color-mix(in_oklab,var(--bg-canvas)_94%,transparent)] backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:static lg:inset-auto lg:z-auto lg:border-t-0 lg:bg-transparent lg:backdrop-blur-none lg:pb-0"
        >
          <div className="mx-auto grid max-w-2xl grid-cols-4 lg:flex lg:max-w-none lg:items-center lg:gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 pt-2 pb-1.5 text-[0.68rem] font-medium leading-tight transition-colors sm:text-xs lg:min-h-0 lg:flex-row lg:gap-1.5 lg:whitespace-nowrap lg:px-2 lg:py-4 lg:text-sm xl:gap-2 xl:px-2.5 ${
                    isActive
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 lg:h-4 lg:w-4 ${
                      isActive ? 'text-[var(--color-accent)]' : 'text-[var(--text-secondary)]'
                    }`}
                    aria-hidden="true"
                  />
                  <span aria-hidden="true" className="truncate sm:hidden">
                    {item.shortLabel}
                  </span>
                  <span className="sr-only sm:not-sr-only lg:inline lg:whitespace-nowrap">{item.label}</span>
                  {item.id === 'achievements' && unlockedCount > 0 ? (
                    <span className="absolute top-1 right-[calc(50%-1.55rem)] rounded-full bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[0.58rem] font-semibold leading-none text-[var(--color-accent)] ring-2 ring-[var(--bg-canvas)] tabular-nums lg:static lg:rounded lg:text-[0.7rem] lg:ring-0">
                      {unlockedCount}
                    </span>
                  ) : null}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                      className="absolute inset-x-3 top-0 h-[2px] rounded-b-full bg-[var(--color-accent)] lg:inset-x-1 lg:top-auto lg:bottom-0 lg:rounded-none"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:py-3">
          {summary.currentStreak > 0 && (
            <span className="inline-flex items-center whitespace-nowrap rounded-md bg-[var(--color-lamp-soft)] px-2 py-1 text-[0.72rem] font-medium text-[var(--color-lamp)] tabular-nums sm:bg-transparent sm:px-1 sm:py-0 sm:text-xs sm:text-[var(--text-secondary)]">
              {summary.currentStreak}d
              <span className="sr-only sm:not-sr-only lg:hidden xl:inline">&nbsp;streak</span>
            </span>
          )}
          <button
            type="button"
            onClick={onOpenAccount}
            disabled={authLoading}
            aria-label={
              user
                ? 'Open account and cloud sync'
                : 'Sign in to sync your Sanctuary account'
            }
            className="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] disabled:opacity-60 sm:min-h-9 sm:min-w-0 sm:px-3"
          >
            {user ? (
              <>
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 rounded-full ${syncDotClass}`}
                />
                <span className="max-w-20 truncate sm:max-w-24">{accountLabel}</span>
              </>
            ) : (
              <>
                <User className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                <span className="hidden sm:inline">{authLoading ? 'Loading…' : accountLabel}</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open settings and data backup"
            className="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] sm:min-h-9 sm:min-w-0 sm:px-3"
          >
            <Settings className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
