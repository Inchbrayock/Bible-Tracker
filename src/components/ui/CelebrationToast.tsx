import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
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
      className="pointer-events-none fixed bottom-5 right-5 z-40 flex w-[min(92vw,23rem)] flex-col gap-3"
    >
      <AnimatePresence>
        {visible.map((item) => (
          <motion.div
            key={item.definition.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex items-center gap-3.5 rounded-lg border border-[var(--color-accent)] bg-[var(--bg-elevated)] p-3.5 shadow-lg"
          >
            <MedallionIcon
              motif={item.definition.motif}
              tier={item.definition.tier}
              unlocked={true}
              size={48}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[var(--color-accent)]">Seal unlocked</p>
              <p className="truncate font-display text-base font-medium text-[var(--text-primary)]">
                {item.definition.title}
              </p>
              <button
                type="button"
                onClick={() => {
                  onInspect(item);
                  onDismiss(item.definition.id);
                }}
                className="mt-0.5 text-xs font-medium text-[var(--color-sage)] underline-offset-2 hover:underline"
              >
                Inspect seal
              </button>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(item.definition.id)}
              aria-label={`Dismiss ${item.definition.title} notification`}
              className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
