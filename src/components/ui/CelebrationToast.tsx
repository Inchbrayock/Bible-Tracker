import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { SPRING_SEAL, TACTILE_PILL_TAP } from '../../lib/motion';
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
      className="pointer-events-none fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex w-auto max-w-[23rem] flex-col gap-3 sm:inset-x-auto sm:right-5 lg:bottom-5"
    >
      <AnimatePresence mode="popLayout">
        {visible.map((item) => (
          <motion.div
            key={item.definition.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 90, scale: 0.94 }}
            transition={SPRING_SEAL}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.45}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.x) > 72 || Math.abs(info.velocity.x) > 360) {
                onDismiss(item.definition.id);
              }
            }}
            className="pointer-events-auto relative flex cursor-grab items-center gap-3.5 overflow-hidden rounded-lg border border-[var(--color-accent)] bg-[var(--bg-elevated)] p-3.5 shadow-lg active:cursor-grabbing"
          >
            {/* Specular gleam sweep on arrival */}
            <span
              aria-hidden="true"
              className="sheen-sweep-anim pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-[color-mix(in_oklab,var(--color-lamp)_22%,white)] to-transparent opacity-0"
            />

            <motion.div
              initial={{ rotate: -22, scale: 0.68 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ ...SPRING_SEAL, delay: 0.06 }}
              className="shrink-0"
            >
              <MedallionIcon
                motif={item.definition.motif}
                tier={item.definition.tier}
                unlocked={true}
                size={48}
              />
            </motion.div>
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
                className="tactile-press mt-0.5 text-xs font-medium text-[var(--color-sage)] underline-offset-2 hover:underline"
              >
                Inspect seal
              </button>
            </div>
            <motion.button
              type="button"
              whileTap={TACTILE_PILL_TAP}
              onClick={() => onDismiss(item.definition.id)}
              aria-label={`Dismiss ${item.definition.title} notification`}
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] sm:min-h-8 sm:min-w-8"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </motion.button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
