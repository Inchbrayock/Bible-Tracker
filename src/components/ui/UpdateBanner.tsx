import React from 'react';
import { ArrowDownToLine, RefreshCw, X } from 'lucide-react';
import { useAppUpdater } from '../../lib/useAppUpdater';

export const UpdateBanner: React.FC = () => {
  const {
    isAndroidNative,
    status,
    downloadProgress,
    availableUpdate,
    needsInstallPermission,
    bannerDismissed,
    applyUpdate,
    dismissBanner,
  } = useAppUpdater();

  if (bannerDismissed) return null;

  const showDownload = status === 'downloading' && availableUpdate;
  const showReady = (status === 'ready' || status === 'installing') && availableUpdate;

  if (!showDownload && !showReady) return null;

  const pct =
    typeof downloadProgress === 'number' && downloadProgress >= 0 ? Math.min(100, downloadProgress) : null;

  return (
    <section
      aria-label="App update notification"
      className="mb-6 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent-soft)] p-4 sm:px-6"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          {isAndroidNative ? (
            <ArrowDownToLine
              className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent)]"
              aria-hidden="true"
            />
          ) : (
            <RefreshCw
              className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent)]"
              aria-hidden="true"
            />
          )}
          <div className="min-w-0 flex-1">
            {showDownload ? (
              <>
                <h2 className="font-display text-base font-medium text-[var(--text-primary)]">
                  Downloading Selah v{availableUpdate.version}
                  {pct !== null ? ` (${pct}%)` : '…'}
                </h2>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                  Verifying the signed release package in the background. You can keep reading.
                </p>
                {pct !== null && (
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pct}
                    className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[var(--bg-elevated)]"
                  >
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-150"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </>
            ) : isAndroidNative ? (
              <>
                <h2 className="font-display text-base font-medium text-[var(--text-primary)]">
                  Selah v{availableUpdate.version} is ready to install
                </h2>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {needsInstallPermission
                    ? 'Allow Selah to install updates when Android prompts, and future updates will install smoothly while keeping all your reading data.'
                    : 'Your local readings and notes are preserved when updating.'}
                </p>
              </>
            ) : (
              <>
                <h2 className="font-display text-base font-medium text-[var(--text-primary)]">
                  Selah v{availableUpdate.version} is ready
                </h2>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                  Refresh once to switch to the latest version. Your saved readings stay intact.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {showReady && (
            <button
              type="button"
              disabled={status === 'installing'}
              onClick={() => void applyUpdate()}
              className="btn-primary min-h-10 flex-1 rounded-md px-3.5 py-2 text-xs font-medium hover:opacity-90 disabled:opacity-60 sm:min-h-9 sm:flex-initial"
            >
              {status === 'installing'
                ? 'Opening installer…'
                : isAndroidNative
                  ? 'Install update'
                  : 'Refresh now'}
            </button>
          )}
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Dismiss update notification"
            className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)] sm:min-h-9"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{showDownload ? 'Hide' : 'Later'}</span>
          </button>
        </div>
      </div>
    </section>
  );
};
