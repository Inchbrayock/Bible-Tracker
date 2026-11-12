import React, { useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { AchievementModal } from './components/achievements/AchievementModal';
import { AchievementsView } from './components/achievements/AchievementsView';
import { AccountDialog } from './components/auth/AccountDialog';
import { MergeBanner } from './components/auth/MergeBanner';
import { DashboardView } from './components/dashboard/DashboardView';
import { JournalView } from './components/journal/JournalView';
import { BookDetailDialog } from './components/library/BookDetailDialog';
import { LibraryView } from './components/library/LibraryView';
import { SettingsDialog } from './components/settings/SettingsDialog';
import { AppHeader, type AppTab } from './components/ui/AppHeader';
import { CelebrationToast } from './components/ui/CelebrationToast';
import { BibleStoreProvider, useBibleStore } from './store/useBibleStore';
import type { AchievementStatus } from './types/bible';

const TAB_TITLES: Record<AppTab, string> = {
  dashboard: 'Sanctuary | Selah',
  library: 'Books & Chapters | Selah',
  achievements: 'Hall of Seals | Selah',
  journal: 'Journal & Plans | Selah',
};

const SanctuaryShell: React.FC = () => {
  const {
    ready,
    user,
    announcement,
    unlockedQueue,
    dismissUnlockedAchievement,
  } = useBibleStore();

  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [openBookId, setOpenBookId] = useState<string | null>(null);
  const [inspectedAchievement, setInspectedAchievement] = useState<{
    status: AchievementStatus;
    isNew: boolean;
  } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    document.title = TAB_TITLES[activeTab];
  }, [activeTab]);

  return (
    <div className="min-h-dvh flex flex-col">
      <a href="#main-content" className="skip-link visually-hidden">
        Skip to main content
      </a>

      <AppHeader
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAccount={() => setAccountOpen(true)}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10"
      >
        <MergeBanner />
        {!ready ? (
          <div className="folio-sheet p-8 text-center text-sm text-[var(--text-secondary)]">
            Opening your reading ledger…
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeTab === 'dashboard' && (
                <DashboardView
                  onOpenBook={setOpenBookId}
                  onInspectAchievement={(status) =>
                    setInspectedAchievement({ status, isNew: false })
                  }
                  onNavigateTab={setActiveTab}
                />
              )}
              {activeTab === 'library' && <LibraryView onOpenBook={setOpenBookId} />}
              {activeTab === 'achievements' && (
                <AchievementsView
                  onInspectAchievement={(status) =>
                    setInspectedAchievement({ status, isNew: false })
                  }
                />
              )}
              {activeTab === 'journal' && <JournalView onOpenBook={setOpenBookId} />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <footer className="border-t border-[var(--border-subtle)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-[var(--text-secondary)] sm:px-6">
          <span className="font-display text-sm font-medium text-[var(--text-primary)]">
            Selah
          </span>
          <span>
            {user
              ? 'Synced Bible reading ledger across 66 books and 1,189 chapters.'
              : 'Local-first Bible reading ledger with optional cloud account sync across 66 books and 1,189 chapters.'}
          </span>
        </div>
      </footer>

      <BookDetailDialog bookId={openBookId} onClose={() => setOpenBookId(null)} />

      <AchievementModal
        achievement={inspectedAchievement?.status ?? null}
        isNewUnlock={inspectedAchievement?.isNew ?? false}
        onClose={() => setInspectedAchievement(null)}
      />

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenAccount={() => setAccountOpen(true)}
      />

      <AccountDialog open={accountOpen} onClose={() => setAccountOpen(false)} />

      <CelebrationToast
        queue={unlockedQueue}
        onInspect={(status) => setInspectedAchievement({ status, isNew: true })}
        onDismiss={dismissUnlockedAchievement}
      />

      {/* Single centralized polite live region */}
      <div aria-live="polite" aria-atomic="true" className="visually-hidden">
        {announcement}
      </div>
    </div>
  );
};

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BibleStoreProvider>
        <SanctuaryShell />
      </BibleStoreProvider>
    </MotionConfig>
  );
}

export default App;
