import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import type { AchievementStatus } from '../../types/bible';
import { MedallionIcon } from '../achievements/MedallionIcon';

interface CelebrationToastProps {
  queue: AchievementStatus[];
  onInspect: (achievement: AchievementStatus) => void;
  onDismiss: (id: string) => void;
}

export const CelebrationToast: React.FC<CelebrationToastProps> = ({
  queue,
  onInspect,
  onDismiss,
}) => {
  const visible = queue.slice(0, 2);

  return (
    <div
      aria-label="Unlocked achievement notifications"
      className="pointer-events-none fixed bottom-4 right-4 z-40 flex w-[min(92vw,24rem)] flex-col gap-3"
    >
      <AnimatePresence>
        {visible.map((item) => (
          <motion.div
            key={item.definition.id}
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="sheen-overlay pointer-events-auto flex items-center gap-3.5 rounded-2xl border border-[var(--color-accent)] bg-[var(--bg-elevated)] p-3.5 shadow-xl"
          >
            <MedallionIcon
              motif={item.definition.motif}
              tier={item.definition.tier}
              unlocked={true}
              size={52}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[0.68rem] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                <span>Seal Unlocked</span>
              </div>
              <p className="truncate font-display text-base font-semibold text-[var(--text-primary)]">
                {item.definition.title}
              </p>
              <button
                type="button"
                onClick={() => {
                  onInspect(item);
                  onDismiss(item.definition.id);
                }}
                className="mt-0.5 text-xs font-semibold text-[var(--color-sage)] underline-offset-2 hover:underline"
              >
                Inspect medallion
              </button>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(item.definition.id)}
              aria-label={`Dismiss ${item.definition.title} notification`}
              className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
