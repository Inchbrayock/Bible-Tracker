import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  BookOpen,
  Cloud,
  Database,
  Download,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  SlidersHorizontal,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { exportSanctuaryBackupFile } from '../../lib/backupFile';
import { SPRING_TACTILE, TACTILE_TAP } from '../../lib/motion';
import { getSystemPrefersDark } from '../../lib/theme';
import { useAppUpdater } from '../../lib/useAppUpdater';
import { useBibleStore } from '../../store/useBibleStore';
import type { ColorSchemePreference } from '../../types/bible';
import { ProfileAvatar } from '../ui/ProfileAvatar';

interface SettingsViewProps {
  onBack: () => void;
  backLabel: string;
  onOpenAccount: () => void;
}

const SECTION_LINKS: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'settings-account', label: 'Cloud account', icon: Cloud },
  { id: 'settings-appearance', label: 'Appearance', icon: Palette },
  { id: 'settings-cadence', label: 'Reading cadence', icon: SlidersHorizontal },
  { id: 'settings-data', label: 'Data & portability', icon: Database },
  { id: 'settings-updates', label: 'App updates', icon: RefreshCw },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  onBack,
  backLabel,
  onOpenAccount,
}) => {
  const {
    user,
    syncStatus,
    colorScheme,
    setColorScheme,
    preferences,
    updatePreferences,
    exportBackupJson,
    importBackupJson,
    activateDemoJourney,
    resetAllData,
  } = useBibleStore();
  const {
    currentVersion,
    currentBuild,
    isAndroidNative,
    autoUpdateEnabled,
    setAutoUpdateEnabled,
    status: updateStatus,
    downloadProgress,
    availableUpdate,
    errorMessage: updateErrorMessage,
    checkForUpdates,
    applyUpdate,
  } = useAppUpdater();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const systemDark = getSystemPrefersDark();

  const handleExport = async () => {
    try {
      const json = exportBackupJson();
      const result = await exportSanctuaryBackupFile(json);
      setStatusMsg(result.message);
      setErrorMsg(null);
    } catch (err) {
      if (err instanceof Error && /cancel(ed|led)/i.test(err.message)) {
        return;
      }
      setErrorMsg(err instanceof Error ? err.message : 'Could not export backup file.');
      setStatusMsg(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const count = await importBackupJson(text);
      setStatusMsg(`Restored ${count} reading log entries.`);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not import backup file.');
      setStatusMsg(null);
    } finally {
      e.target.value = '';
    }
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const themeOptions: {
    id: ColorSchemePreference;
    label: string;
    detail: string;
    icon: React.ComponentType<{ className?: string }>;
    swatchBg: string;
    swatchInk: string;
    swatchAccent: string;
  }[] = [
    {
      id: 'system',
      label: 'System',
      detail: `Matches OS (${systemDark ? 'dark' : 'light'})`,
      icon: Monitor,
      swatchBg: systemDark ? '#12151B' : '#F7F7F4',
      swatchInk: systemDark ? '#EDEFF3' : '#161B22',
      swatchAccent: systemDark ? '#7FA9E8' : '#1D427D',
    },
    {
      id: 'light',
      label: 'Dawn Parchment',
      detail: 'Alabaster paper',
      icon: Sun,
      swatchBg: '#F7F7F4',
      swatchInk: '#161B22',
      swatchAccent: '#1D427D',
    },
    {
      id: 'dark',
      label: 'Vesper Candlelight',
      detail: 'Midnight slate',
      icon: Moon,
      swatchBg: '#12151B',
      swatchInk: '#EDEFF3',
      swatchAccent: '#7FA9E8',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <section className="border-b border-[var(--border-subtle)] pb-5 sm:pb-6">
        <button
          type="button"
          onClick={onBack}
          className="tactile-press mb-3 inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to {backLabel}</span>
        </button>
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight text-[var(--text-primary)] sm:text-[2.15rem]">
              Sanctuary Settings
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Appearance, cloud account sync, reading cadence, data backup, and updates.
            </p>
          </div>
          <span className="font-mono text-xs text-[var(--text-secondary)]">
            v{currentVersion}
            {currentBuild !== null ? ` (build ${currentBuild})` : ''}
          </span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
        {/* Left Navigation & Account Rail */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:col-span-4">
          <nav
            aria-label="Settings sections"
            className="hidden divide-y divide-[var(--border-subtle)] overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] lg:block"
          >
            {SECTION_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                >
                  <Icon className="h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Cloud Account Summary */}
          <section
            id="settings-account"
            className="folio-sheet scroll-mt-20 p-4 sm:p-5"
            aria-labelledby="settings-account-heading"
          >
            <div className="flex items-start gap-3">
              {user ? (
                <ProfileAvatar user={user} sizeClassName="h-10 w-10" textClassName="text-sm" />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <Cloud className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2
                  id="settings-account-heading"
                  className="font-display text-lg font-medium text-[var(--text-primary)]"
                >
                  {user ? user.displayName || user.email || 'Signed in' : 'Cloud account sync'}
                </h2>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {user
                    ? `Backing up to ${user.email ?? 'your account'} (${syncStatus}).`
                    : 'Sign in to save your readings, plans, and study notes across devices.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenAccount}
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface)] sm:min-h-9"
            >
              {user ? 'Manage account' : 'Sign in'}
            </button>
          </section>
        </aside>

        {/* Main Settings Sections */}
        <div className="space-y-6 lg:col-span-8">
          {/* Theme Swatches */}
          <section
            id="settings-appearance"
            className="folio-sheet scroll-mt-20 p-5 sm:p-6"
            aria-labelledby="settings-appearance-heading"
          >
            <h2
              id="settings-appearance-heading"
              className="font-display text-xl font-medium text-[var(--text-primary)]"
            >
              Appearance
            </h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Choose the paper and ink palette for reading and logging.
            </p>

            <fieldset className="mt-4">
              <legend className="text-xs font-medium text-[var(--text-secondary)]">
                Color scheme
              </legend>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-3 sm:gap-2.5">
                {themeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const active = colorScheme === opt.id;
                  return (
                    <motion.button
                      key={opt.id}
                      type="button"
                      whileTap={TACTILE_TAP}
                      transition={SPRING_TACTILE}
                      onClick={() => setColorScheme(opt.id)}
                      aria-pressed={active}
                      className={`relative flex min-h-12 flex-row items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors sm:min-h-0 sm:flex-col sm:items-start sm:justify-start sm:gap-0 ${
                        active
                          ? 'border-[var(--color-accent)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="theme-swatch-pill"
                          transition={SPRING_TACTILE}
                          aria-hidden="true"
                          className="absolute inset-0 rounded-[5px] bg-[var(--color-accent-soft)]"
                        />
                      )}
                      <div className="relative z-10 flex items-center gap-3 sm:w-full sm:justify-between">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${active ? 'text-[var(--color-accent)]' : 'text-[var(--text-secondary)]'}`}
                          aria-hidden="true"
                        />
                        <div className="sm:hidden">
                          <span className="block text-sm font-medium text-[var(--text-primary)]">
                            {opt.label}
                          </span>
                          <span className="block text-xs text-[var(--text-secondary)]">
                            {opt.detail}
                          </span>
                        </div>
                        <span
                          aria-hidden="true"
                          className="hidden h-4 w-7 items-center justify-around rounded-xs border border-black/15 px-0.5 sm:flex"
                          style={{ backgroundColor: opt.swatchBg }}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: opt.swatchInk }}
                          />
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: opt.swatchAccent }}
                          />
                        </span>
                      </div>
                      <span
                        aria-hidden="true"
                        className="relative z-10 flex h-4 w-7 shrink-0 items-center justify-around rounded-xs border border-black/15 px-0.5 sm:hidden"
                        style={{ backgroundColor: opt.swatchBg }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: opt.swatchInk }}
                        />
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: opt.swatchAccent }}
                        />
                      </span>
                      <span className="relative z-10 mt-2.5 hidden text-sm font-medium text-[var(--text-primary)] sm:block">
                        {opt.label}
                      </span>
                      <span className="relative z-10 hidden text-xs text-[var(--text-secondary)] sm:block">
                        {opt.detail}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </fieldset>
          </section>

          {/* Preferences */}
          <section
            id="settings-cadence"
            className="folio-sheet scroll-mt-20 space-y-3.5 p-5 sm:p-6"
            aria-labelledby="settings-cadence-heading"
          >
            <div>
              <h2
                id="settings-cadence-heading"
                className="font-display text-xl font-medium text-[var(--text-primary)]"
              >
                Reading cadence & feedback
              </h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Control streak grace rules and milestone animations.
              </p>
            </div>

            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
              <div>
                <span className="block text-sm font-medium text-[var(--text-primary)]">
                  Sabbath grace day (1 rest day per week)
                </span>
                <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">
                  Preserves your reading streak if you miss up to one day in a 7-day window.
                </span>
              </div>
              <input
                type="checkbox"
                checked={preferences.streakGraceEnabled}
                onChange={(e) =>
                  void updatePreferences({ streakGraceEnabled: e.target.checked })
                }
                className="mt-1 h-4 w-4 shrink-0"
              />
            </label>

            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
              <div>
                <span className="block text-sm font-medium text-[var(--text-primary)]">
                  Milestone celebrations
                </span>
                <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">
                  Show subtle bursts when finishing a book or unlocking major seals.
                </span>
              </div>
              <input
                type="checkbox"
                checked={preferences.celebrationsEnabled}
                onChange={(e) =>
                  void updatePreferences({ celebrationsEnabled: e.target.checked })
                }
                className="mt-1 h-4 w-4 shrink-0"
              />
            </label>
          </section>

          {/* Data Backup & Sample Journey */}
          <section
            id="settings-data"
            className="folio-sheet scroll-mt-20 space-y-4 p-5 sm:p-6"
            aria-labelledby="settings-data-heading"
          >
            <div>
              <h2
                id="settings-data-heading"
                className="font-display text-xl font-medium text-[var(--text-primary)]"
              >
                Data & portability
              </h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Export or restore your reading ledger as portable JSON, or try a sample journey.
              </p>
            </div>

            <div className="grid gap-2 sm:flex sm:flex-wrap sm:gap-2.5">
              <button
                type="button"
                onClick={() => void handleExport()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] sm:min-h-9"
              >
                <Download className="h-3.5 w-3.5 text-[var(--color-sage)]" aria-hidden="true" />
                <span>Export JSON backup</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] sm:min-h-9"
              >
                <Upload className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden="true" />
                <span>Import JSON backup</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json,text/plain"
                onChange={(e) => void handleFileChange(e)}
                className="visually-hidden"
                aria-label="Choose Selah JSON backup file"
              />

              <button
                type="button"
                onClick={() => {
                  void activateDemoJourney().then(() => {
                    setStatusMsg('Loaded sample reading journey.');
                    setErrorMsg(null);
                  });
                }}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] sm:min-h-9"
              >
                <BookOpen className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden="true" />
                <span>Load sample journey</span>
              </button>
            </div>

            {statusMsg ? (
              <p role="status" className="text-xs font-medium text-[var(--color-sage)]">
                {statusMsg}
              </p>
            ) : null}
            {errorMsg ? (
              <p role="alert" className="text-xs font-medium text-[var(--color-crimson)]">
                {errorMsg}
              </p>
            ) : null}

            <div className="border-t border-[var(--border-subtle)] pt-3">
              <AnimatePresence mode="wait" initial={false}>
                {!confirmReset ? (
                  <motion.button
                    key="reset-trigger"
                    type="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.14 }}
                    onClick={() => setConfirmReset(true)}
                    className="tactile-press inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-[var(--color-crimson)] hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Reset all reading data…</span>
                  </motion.button>
                ) : (
                  <motion.div
                    key="reset-confirm"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={SPRING_TACTILE}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--color-crimson)] bg-[var(--bg-surface)] p-3 text-xs"
                  >
                    <span className="font-medium text-[var(--text-primary)]">
                      Permanently erase all logs and seals?
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                        className="tactile-press min-h-9 rounded border border-[var(--border-subtle)] px-3 py-1 font-medium text-[var(--text-secondary)]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void resetAllData().then(() => {
                            setConfirmReset(false);
                            setStatusMsg('All reading data cleared.');
                          });
                        }}
                        className="btn-danger tactile-press min-h-9 rounded px-3 py-1 font-semibold"
                      >
                        Confirm clear
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* App Updates */}
          <section
            id="settings-updates"
            className="folio-sheet scroll-mt-20 space-y-3.5 p-5 sm:p-6"
            aria-labelledby="settings-updates-heading"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2
                  id="settings-updates-heading"
                  className="font-display text-xl font-medium text-[var(--text-primary)]"
                >
                  App updates
                </h2>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Keep Selah current while preserving all saved reading logs.
                </p>
              </div>
              <span className="font-mono text-xs text-[var(--text-secondary)]">
                v{currentVersion}
                {currentBuild !== null ? ` (build ${currentBuild})` : ''}
              </span>
            </div>

            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
              <div>
                <span className="block text-sm font-medium text-[var(--text-primary)]">
                  Automatic updates
                </span>
                <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">
                  {isAndroidNative
                    ? 'Automatically download verified APK updates on startup and prompt to install.'
                    : 'Automatically check for new versions and refresh when an update is ready.'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoUpdateEnabled}
                onChange={(e) => setAutoUpdateEnabled(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-2">
              {updateStatus === 'ready' && availableUpdate ? (
                <button
                  type="button"
                  onClick={() => void applyUpdate()}
                  className="btn-primary inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3.5 py-2 text-xs font-medium hover:opacity-90 sm:min-h-9"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {isAndroidNative
                      ? `Install v${availableUpdate.version}`
                      : `Reload to v${availableUpdate.version}`}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={
                    updateStatus === 'checking' ||
                    updateStatus === 'downloading' ||
                    updateStatus === 'installing' ||
                    updateStatus === 'reloading'
                  }
                  onClick={() => void checkForUpdates({ manual: true })}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:opacity-60 sm:min-h-9"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 text-[var(--color-accent)] ${
                      updateStatus === 'checking' || updateStatus === 'downloading'
                        ? 'animate-spin'
                        : ''
                    }`}
                    aria-hidden="true"
                  />
                  <span>
                    {updateStatus === 'checking'
                      ? 'Checking…'
                      : updateStatus === 'downloading'
                        ? `Downloading${
                            typeof downloadProgress === 'number' && downloadProgress >= 0
                              ? ` (${downloadProgress}%)`
                              : '…'
                          }`
                        : updateStatus === 'installing'
                          ? 'Opening installer…'
                          : 'Check for updates'}
                  </span>
                </button>
              )}

              {updateStatus === 'up-to-date' && (
                <span role="status" className="text-xs font-medium text-[var(--color-sage)]">
                  Up to date on v{currentVersion}.
                </span>
              )}
            </div>

            {updateErrorMessage ? (
              <p role="alert" className="text-xs font-medium text-[var(--color-crimson)]">
                {updateErrorMessage}
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
};
