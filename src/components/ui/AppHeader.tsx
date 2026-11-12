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
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'Sanctuary', icon: Compass },
  { id: 'library', label: 'Books & Chapters', icon: BookOpen },
  { id: 'achievements', label: 'Hall of Seals', icon: Award },
  { id: 'journal', label: 'Journal & Plans', icon: ScrollText },
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
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 pt-3 sm:px-6 lg:py-0">
        {/* Wordmark & Live Count */}
        <div className="flex items-center gap-3 py-1 lg:py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <SanctuaryLamp active={summary.currentStreak > 0} size={26} />
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-2xl font-medium tracking-tight text-[var(--text-primary)]">
              Selah
            </span>
            <span className="hidden text-xs font-medium text-[var(--text-secondary)] tabular-nums sm:inline">
              {summary.totalChaptersRead.toLocaleString()} / {summary.totalChapters.toLocaleString()} chapters
            </span>
          </div>
        </div>

        {/* Underline Editorial Navigation */}
        <nav
          aria-label="Primary"
          className="order-3 -mx-4 flex w-[calc(100%+2rem)] overflow-x-auto border-t border-[var(--border-subtle)] px-4 lg:order-2 lg:mx-0 lg:w-auto lg:border-t-0 lg:px-0"
        >
          <div className="flex min-w-full gap-1 sm:gap-2 lg:min-w-0">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex flex-1 items-center justify-center gap-2 whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors lg:flex-initial lg:py-4 ${
                    isActive
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-[var(--color-accent)]' : 'text-[var(--text-secondary)]'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                  {item.id === 'achievements' && unlockedCount > 0 ? (
                    <span className="rounded bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[0.7rem] font-semibold leading-none text-[var(--color-accent)] tabular-nums">
                      {unlockedCount}
                    </span>
                  ) : null}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                      className="absolute inset-x-1 bottom-0 h-[2px] bg-[var(--color-accent)]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Actions */}
        <div className="order-2 flex items-center gap-2 py-1 lg:order-3 lg:py-3">
          {summary.currentStreak > 0 && (
            <span className="hidden text-xs font-medium text-[var(--text-secondary)] tabular-nums md:inline lg:hidden xl:inline">
              {summary.currentStreak}d streak
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
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] disabled:opacity-60"
          >
            {user ? (
              <>
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${syncDotClass}`}
                />
                <span className="max-w-24 truncate">{accountLabel}</span>
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
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]"
          >
            <Settings className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
