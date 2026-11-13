import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CloudUpload } from 'lucide-react';
import { FOLIO_EASE, SPRING_TACTILE, TACTILE_TAP } from '../../lib/motion';
import { useBibleStore } from '../../store/useBibleStore';

export const MergeBanner: React.FC = () => {
  const { pendingMerge, syncStatus, resolveGuestMerge } = useBibleStore();

  const busy = syncStatus === 'syncing';
  const count = pendingMerge?.guestLogs.length ?? 0;

  return (
    <AnimatePresence>
      {pendingMerge && (
        <motion.section
          key="merge-banner"
          aria-label="Local reading data merge prompt"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: FOLIO_EASE }}
          className="mb-6 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent-soft)] p-4 sm:px-6"
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <CloudUpload
                className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent)]"
                aria-hidden="true"
              />
              <div>
                <h2 className="font-display text-base font-medium text-[var(--text-primary)]">
                  Unmerged local readings found on this device
                </h2>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                  You recorded {count} local reading {count === 1 ? 'session' : 'sessions'} before
                  signing in, while your account already holds {pendingMerge.cloudLogsCount} in the
                  cloud.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <motion.button
                type="button"
                whileTap={TACTILE_TAP}
                transition={SPRING_TACTILE}
                disabled={busy}
                onClick={() => void resolveGuestMerge('merge')}
                className="btn-primary min-h-10 flex-1 rounded-md px-3.5 py-2 text-xs font-medium hover:opacity-90 disabled:opacity-60 sm:min-h-9 sm:flex-initial"
              >
                Merge into my account
              </motion.button>
              <motion.button
                type="button"
                whileTap={TACTILE_TAP}
                transition={SPRING_TACTILE}
                disabled={busy}
                onClick={() => void resolveGuestMerge('cloud-only')}
                className="min-h-10 flex-1 rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)] disabled:opacity-60 sm:min-h-9 sm:flex-initial"
              >
                Keep cloud only
              </motion.button>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
};
