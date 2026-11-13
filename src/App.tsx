import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { AchievementModal } from './components/achievements/AchievementModal';
import { AchievementsView } from './components/achievements/AchievementsView';
import { AccountDialog } from './components/auth/AccountDialog';
import { MergeBanner } from './components/auth/MergeBanner';
import { DashboardView } from './components/dashboard/DashboardView';
import { JournalView } from './components/journal/JournalView';
import { BookDetailDialog } from './components/library/BookDetailDialog';
import { LibraryView } from './components/library/LibraryView';
import { SettingsView } from './components/settings/SettingsView';
import { AppHeader, type AppTab, type PrimaryTab } from './components/ui/AppHeader';
import { CelebrationToast } from './components/ui/CelebrationToast';
import { UpdateBanner } from './components/ui/UpdateBanner';
import { FOLIO_EASE } from './lib/motion';
import { hideNativeSplashScreen, subscribeNativeBackButton } from './lib/nativeShell';
import { AppUpdaterProvider } from './lib/useAppUpdater';
import { BibleStoreProvider, useBibleStore } from './store/useBibleStore';
import type { AchievementStatus } from './types/bible';

const PRIMARY_TAB_LABELS: Record<PrimaryTab, string> = {
  dashboard: 'Sanctuary',
  library: 'Books & Chapters',
  achievements: 'Hall of Seals',
  journal: 'Journal & Plans',
};

const TAB_TITLES: Record<AppTab, string> = {
  dashboard: 'Sanctuary | Selah',
  library: 'Books & Chapters | Selah',
  achievements: 'Hall of Seals | Selah',
  journal: 'Journal & Plans | Selah',
  settings: 'Settings | Selah',
};

const SanctuaryAppContent: React.FC = () => {
  const {
    ready,
    user,
    announcement,
    unlockedQueue,
    dismissUnlockedAchievement,
  } = useBibleStore();

  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [returnTab, setReturnTab] = useState<PrimaryTab>('dashboard');
  const returnTabRef = useRef<PrimaryTab>('dashboard');
  returnTabRef.current = returnTab;

  const [journalInitialTab, setJournalInitialTab] = useState<'journal' | 'plans'>('journal');
  const [openBookId, setOpenBookId] = useState<string | null>(null);
  const [inspectedAchievement, setInspectedAchievement] = useState<{
    status: AchievementStatus;
    isNew: boolean;
  } | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountAnchorRef = useRef<HTMLButtonElement | null>(null);

  const navigateToTab = useCallback(
    (nextTab: AppTab, options?: { journalSubTab?: 'journal' | 'plans' }) => {
      if (nextTab === 'settings') {
        setOpenBookId(null);
      } else {
        setReturnTab(nextTab);
        setJournalInitialTab(options?.journalSubTab ?? 'journal');
      }
      setActiveTab(nextTab);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    },
    []
  );

  const backStateRef = useRef({
    inspectedAchievement,
    accountOpen,
    openBookId,
    activeTab,
  });
  backStateRef.current = {
    inspectedAchievement,
    accountOpen,
    openBookId,
    activeTab,
  };

  useEffect(() => {
    if (ready) {
      void hideNativeSplashScreen();
    }
  }, [ready]);

  useEffect(() => {
    return subscribeNativeBackButton(() => {
      const state = backStateRef.current;
      if (state.inspectedAchievement !== null) {
        setInspectedAchievement(null);
        return true;
      }
      if (state.accountOpen) {
        setAccountOpen(false);
        return true;
      }
      if (state.openBookId !== null) {
        setOpenBookId(null);
        return true;
      }
      if (state.activeTab === 'settings') {
        navigateToTab(returnTabRef.current);
        return true;
      }
      if (state.activeTab !== 'dashboard') {
        navigateToTab('dashboard');
        return true;
      }
      return false;
    });
  }, [navigateToTab]);

  useEffect(() => {
    document.title = TAB_TITLES[activeTab];
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [activeTab]);

  return (
    <div className="min-h-dvh flex flex-col overflow-x-clip">
      <a href="#main-content" className="skip-link visually-hidden">
        Skip to main content
      </a>

      <AppHeader
        activeTab={activeTab}
        onSelectTab={(tab) => navigateToTab(tab)}
        onOpenAccount={() => setAccountOpen((prev) => !prev)}
        accountOpen={accountOpen}
        accountButtonRef={accountAnchorRef}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-3.5 py-5 sm:px-6 sm:py-9 lg:py-10"
      >
        <UpdateBanner />
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
              transition={{ duration: 0.16, ease: FOLIO_EASE }}
            >
              {activeTab === 'dashboard' && (
                <DashboardView
                  onOpenBook={setOpenBookId}
                  onInspectAchievement={(status) =>
                    setInspectedAchievement({ status, isNew: false })
                  }
                  onNavigateTab={(tab, options) => navigateToTab(tab, options)}
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
              {activeTab === 'journal' && (
                <JournalView onOpenBook={setOpenBookId} initialSubTab={journalInitialTab} />
              )}
              {activeTab === 'settings' && (
                <SettingsView
                  onBack={() => navigateToTab(returnTab)}
                  backLabel={PRIMARY_TAB_LABELS[returnTab]}
                  onOpenAccount={() => setAccountOpen(true)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <footer className="border-t border-[var(--border-subtle)] pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-0">
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

      <AccountDialog
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        onOpenSettings={() => navigateToTab('settings')}
        anchorRef={accountAnchorRef}
      />

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

const SanctuaryShell: React.FC = () => {
  const { ready } = useBibleStore();
  return (
    <AppUpdaterProvider ready={ready}>
      <SanctuaryAppContent />
    </AppUpdaterProvider>
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
