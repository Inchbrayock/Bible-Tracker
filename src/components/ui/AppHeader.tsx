import React from 'react';
import { motion } from 'motion/react';
import {
  Award,
  BookOpen,
  Compass,
  ScrollText,
  Settings,
} from 'lucide-react';
import { useBibleStore } from '../../store/useBibleStore';
import { SanctuaryLamp } from './SanctuaryLamp';

export type AppTab = 'dashboard' | 'library' | 'achievements' | 'journal';

interface AppHeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenSettings: () => void;
}

const NAV_ITEMS: { id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Sanctuary', icon: Compass },
  { id: 'library', label: 'Books & Chapters', icon: BookOpen },
  { id: 'achievements', label: 'Hall of Seals', icon: Award },
  { id: 'journal', label: 'Journal & Plans', icon: ScrollText },
];

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenSettings,
}) => {
  const { summary, achievements } = useBibleStore();
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[color-mix(in_oklab,var(--bg-canvas)_88%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs">
            <SanctuaryLamp active={summary.currentStreak > 0} size={30} />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                Selah
              </span>
              <span className="hidden text-xs font-medium text-[var(--text-secondary)] sm:inline">
                Scripture Sanctuary
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] tabular-nums">
              {summary.totalChaptersRead.toLocaleString()} / {summary.totalChapters.toLocaleString()} chapters
              {summary.currentStreak > 0 ? ` · ${summary.currentStreak}d streak` : ''}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label="Primary" className="order-3 w-full overflow-x-auto pb-1 lg:order-2 lg:w-auto lg:pb-0">
          <div className="inline-flex min-w-full gap-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1 lg:min-w-0">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-colors lg:flex-initial ${
                    isActive
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      className="absolute inset-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-xs"
                    />
                  )}
                  <Icon className="relative z-10 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="relative z-10">{item.label}</span>
                  {item.id === 'achievements' && unlockedCount > 0 ? (
                    <span className="relative z-10 rounded-full bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[0.68rem] font-semibold text-[var(--color-accent)] tabular-nums">
                      {unlockedCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Actions */}
        <div className="order-2 flex items-center gap-2 lg:order-3">
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open settings and data backup"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]"
          >
            <Settings className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
