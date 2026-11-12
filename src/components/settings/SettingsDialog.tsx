import React, { useRef, useState } from 'react';
import {
  Download,
  Monitor,
  Moon,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { getSystemPrefersDark } from '../../lib/theme';
import { useBibleStore } from '../../store/useBibleStore';
import type { ColorSchemePreference } from '../../types/bible';
import { ModalDialog } from '../ui/ModalDialog';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const {
    colorScheme,
    setColorScheme,
    preferences,
    updatePreferences,
    exportBackupJson,
    importBackupJson,
    activateDemoJourney,
    resetAllData,
  } = useBibleStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const systemDark = getSystemPrefersDark();

  const handleExport = () => {
    const json = exportBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selah-sanctuary-backup.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg('Backup JSON downloaded.');
    setErrorMsg(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const count = await importBackupJson(text);
      setStatusMsg(`Successfully restored ${count} reading log entries.`);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not import backup file.');
      setStatusMsg(null);
    } finally {
      e.target.value = '';
    }
  };

  const themeOptions: {
    id: ColorSchemePreference;
    label: string;
    detail: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'system',
      label: 'System',
      detail: `Currently ${systemDark ? 'dark' : 'light'}`,
      icon: Monitor,
    },
    { id: 'light', label: 'Dawn Parchment', detail: 'Light theme', icon: Sun },
    { id: 'dark', label: 'Vesper Candlelight', detail: 'Dark theme', icon: Moon },
  ];

  return (
    <ModalDialog open={open} onClose={onClose} labelledBy="settings-title" className="max-w-xl">
      <div className="flex max-h-[88dvh] flex-col">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 py-4">
          <div>
            <h2
              id="settings-title"
              className="font-display text-2xl font-semibold text-[var(--text-primary)]"
            >
              Sanctuary Settings
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Appearance, reading rhythm rules, and local backup portability.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto p-6">
          {/* Theme */}
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Color Scheme
            </legend>
            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const active = colorScheme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setColorScheme(opt.id)}
                    aria-pressed={active}
                    className={`flex flex-col items-start rounded-xl border p-3 text-left transition-colors ${
                      active
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${active ? 'text-[var(--color-accent)]' : 'text-[var(--text-secondary)]'}`}
                      aria-hidden="true"
                    />
                    <span className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                      {opt.label}
                    </span>
                    <span className="text-[0.7rem] text-[var(--text-secondary)]">{opt.detail}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Preferences */}
          <div className="space-y-3 border-t border-[var(--border-subtle)] pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Rhythm & Celebrations
            </h3>

            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5">
              <div>
                <span className="block text-sm font-semibold text-[var(--text-primary)]">
                  Sabbath Grace Day (1 Rest Day / Week)
                </span>
                <span className="block text-xs text-[var(--text-secondary)]">
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

            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5">
              <div>
                <span className="block text-sm font-semibold text-[var(--text-primary)]">
                  Celebratory Confetti Bursts
                </span>
                <span className="block text-xs text-[var(--text-secondary)]">
                  Show warm gold particle bursts when finishing a book or unlocking major seals.
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
          </div>

          {/* Data Backup & Sample Journey */}
          <div className="space-y-3 border-t border-[var(--border-subtle)] pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Data & Portability
            </h3>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--border-strong)]"
              >
                <Download className="h-4 w-4 text-[var(--color-sage)]" aria-hidden="true" />
                <span>Export JSON Backup</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--border-strong)]"
              >
                <Upload className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                <span>Import JSON Backup</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
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
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--border-strong)]"
              >
                <Sparkles className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                <span>Load Sample Journey</span>
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

            <div className="pt-2">
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-crimson)] hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Reset all reading data…</span>
                </button>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-crimson)] bg-[var(--bg-surface)] p-3 text-xs">
                  <span className="font-medium text-[var(--text-primary)]">
                    Permanently erase all logs and seals?
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="rounded-lg border border-[var(--border-subtle)] px-2.5 py-1 font-medium text-[var(--text-secondary)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void resetAllData().then(() => {
                          setConfirmReset(false);
                          setStatusMsg('All sanctuary data cleared.');
                        });
                      }}
                      className="rounded-lg bg-[var(--color-crimson)] px-2.5 py-1 font-semibold text-white"
                    >
                      Confirm Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalDialog>
  );
};
