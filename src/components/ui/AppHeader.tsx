import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Award, BookOpen, Compass, ScrollText, Settings, User } from 'lucide-react';
import { SPRING_DOCK, SPRING_SEAL, TACTILE_PILL_TAP, TACTILE_TAP } from '../../lib/motion';
import { useBibleStore } from '../../store/useBibleStore';
import { AnimatedNumber } from './AnimatedNumber';
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
  const hasStreak = summary.currentStreak > 0;
  const activeIndex = Math.max(
    0,
    NAV_ITEMS.findIndex((item) => item.id === activeTab),
  );

  const tabButtonRefs = useRef<Partial<Record<AppTab, HTMLButtonElement | null>>>({});
  const [underline, setUnderline] = useState<{ left: number; width: number } | null>(null);

  const measureDesktopUnderline = useCallback(() => {
    const el = tabButtonRefs.current[activeTab];
    if (!el || el.offsetWidth === 0) return;
    setUnderline({
      left: el.offsetLeft + 4,
      width: Math.max(0, el.offsetWidth - 8),
    });
  }, [activeTab]);

  useLayoutEffect(() => {
    measureDesktopUnderline();
    window.addEventListener('resize', measureDesktopUnderline);
    return () => window.removeEventListener('resize', measureDesktopUnderline);
  }, [measureDesktopUnderline, unlockedCount]);

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
    <header className="sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
      {/* Keep blur surface on a non-ancestor layer so mobile `position: fixed` bottom dock attaches to viewport */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 border-b border-[var(--border-subtle)] bg-[color-mix(in_oklab,var(--bg-canvas)_94%,transparent)] backdrop-blur-md"
      />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3.5 py-2.5 sm:px-6 lg:gap-4 lg:py-0">
        {/* Wordmark & Live Count */}
        <div className="flex min-w-0 items-center gap-2.5 sm:shrink-0 sm:gap-3 lg:py-3">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors duration-300 sm:h-9 sm:w-9 ${
              hasStreak
                ? 'border-[color-mix(in_oklab,var(--color-lamp)_45%,var(--border-subtle))] bg-[color-mix(in_oklab,var(--color-lamp-soft)_55%,var(--bg-elevated))]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
            }`}
          >
            <SanctuaryLamp active={hasStreak} size={24} />
          </div>
          <div className="flex min-w-0 items-baseline gap-2 sm:gap-3">
            <span className="font-display text-xl font-medium tracking-tight text-[var(--text-primary)] sm:text-2xl">
              Selah
            </span>
            <span className="truncate text-[0.7rem] font-medium text-[var(--text-secondary)] tabular-nums sm:hidden lg:inline xl:hidden">
              <motion.span
                key={summary.totalChaptersRead}
                initial={{ opacity: 0.35, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block"
              >
                {summary.totalChaptersRead.toLocaleString()}/{summary.totalChapters.toLocaleString()}
              </motion.span>
            </span>
            <span className="hidden text-xs font-medium text-[var(--text-secondary)] tabular-nums sm:inline sm:whitespace-nowrap lg:hidden xl:inline">
              <motion.span
                key={summary.totalChaptersRead}
                initial={{ opacity: 0.35, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block"
              >
                {summary.totalChaptersRead.toLocaleString()} / {summary.totalChapters.toLocaleString()} chapters
              </motion.span>
            </span>
          </div>
        </div>

        {/* Responsive Editorial Navigation (Floating bottom pill on < lg, Top inline on lg+) */}
        <nav
          aria-label="Primary"
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 mx-auto max-w-md rounded-full border border-[var(--border-subtle)] bg-[color-mix(in_oklab,var(--bg-elevated)_88%,transparent)] p-1.5 shadow-[0_12px_32px_-8px_rgba(12,16,24,0.22),0_2px_8px_-2px_rgba(12,16,24,0.1)] backdrop-blur-lg lg:static lg:inset-auto lg:z-auto lg:mx-0 lg:max-w-none lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none"
        >
          <div className="relative grid grid-cols-4 lg:flex lg:items-center lg:gap-1">
            {/* Horizontal-only active pill slide on < lg (avoids layoutId projection jumps when window.scrollY resets) */}
            <motion.div
              aria-hidden="true"
              data-testid="mobile-nav-pill"
              initial={false}
              animate={{ x: `${activeIndex * 100}%` }}
              transition={SPRING_DOCK}
              className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/4 px-0.5 lg:hidden"
            >
              <span className="block h-full w-full rounded-full bg-[var(--color-accent-soft)]" />
            </motion.div>

            {/* Horizontal-only active tab underline on lg+ */}
            {underline && (
              <motion.span
                aria-hidden="true"
                data-testid="desktop-nav-underline"
                initial={false}
                animate={{ x: underline.left, width: underline.width }}
                transition={SPRING_DOCK}
                className="pointer-events-none hidden lg:block lg:absolute lg:bottom-0 lg:left-0 lg:h-[2px] lg:bg-[var(--color-accent)]"
              />
            )}

            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <motion.button
                  key={item.id}
                  ref={(el) => {
                    tabButtonRefs.current[item.id] = el;
                  }}
                  type="button"
                  whileTap={TACTILE_PILL_TAP}
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1.5 text-[0.68rem] font-medium leading-tight transition-colors sm:text-xs lg:min-h-0 lg:flex-row lg:gap-1.5 lg:rounded-none lg:whitespace-nowrap lg:px-2 lg:py-4 lg:text-sm xl:gap-2 xl:px-2.5 ${
                    isActive
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <motion.span
                    aria-hidden="true"
                    animate={isActive ? { y: -1, scale: 1.08 } : { y: 0, scale: 1 }}
                    transition={SPRING_DOCK}
                    className="inline-flex items-center justify-center"
                  >
                    <Icon
                      className={`h-[1.15rem] w-[1.15rem] shrink-0 transition-colors lg:h-4 lg:w-4 ${
                        isActive ? 'text-[var(--color-accent)]' : 'text-[var(--text-secondary)]'
                      }`}
                    />
                  </motion.span>
                  <span aria-hidden="true" className="truncate sm:hidden">
                    {item.shortLabel}
                  </span>
                  <span className="sr-only sm:not-sr-only lg:inline lg:whitespace-nowrap">{item.label}</span>
                  {item.id === 'achievements' && unlockedCount > 0 ? (
                    <motion.span
                      key={unlockedCount}
                      initial={{ scale: 0.72 }}
                      animate={{ scale: 1 }}
                      transition={SPRING_SEAL}
                      className="absolute top-1 right-[calc(50%-1.45rem)] rounded-full bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[0.58rem] font-semibold leading-none text-[var(--color-accent)] ring-2 ring-[var(--bg-elevated)] tabular-nums lg:static lg:rounded lg:text-[0.7rem] lg:ring-0"
                    >
                      {unlockedCount}
                    </motion.span>
                  ) : null}
                </motion.button>
              );
            })}
          </div>
        </nav>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:py-3">
          {hasStreak && (
            <span className="inline-flex items-center whitespace-nowrap rounded-md bg-[var(--color-lamp-soft)] px-2 py-1 text-[0.72rem] font-medium text-[var(--color-lamp)] tabular-nums sm:bg-transparent sm:px-1 sm:py-0 sm:text-xs sm:text-[var(--text-secondary)]">
              <AnimatedNumber value={summary.currentStreak}>
                {summary.currentStreak}
              </AnimatedNumber>
              d
              <span className="sr-only sm:not-sr-only lg:hidden xl:inline">&nbsp;streak</span>
            </span>
          )}
          <motion.button
            type="button"
            whileTap={TACTILE_TAP}
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
          </motion.button>
          <motion.button
            type="button"
            whileTap={TACTILE_TAP}
            onClick={onOpenSettings}
            aria-label="Open settings and data backup"
            className="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] sm:min-h-9 sm:min-w-0 sm:px-3"
          >
            <Settings className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true" />
            <span className="hidden sm:inline">Settings</span>
          </motion.button>
        </div>
      </div>
    </header>
  );
};
