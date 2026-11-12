import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Lock, X } from 'lucide-react';
import { formatPlainDate } from '../../lib/dates';
import type { AchievementStatus } from '../../types/bible';
import { ModalDialog } from '../ui/ModalDialog';
import { MedallionIcon } from './MedallionIcon';

interface AchievementModalProps {
  achievement: AchievementStatus | null;
  isNewUnlock?: boolean;
  onClose: () => void;
}

const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze seal',
  silver: 'Silver seal',
  gold: 'Gold seal',
  luminous: 'Luminous seal',
};

export const AchievementModal: React.FC<AchievementModalProps> = ({
  achievement,
  isNewUnlock = false,
  onClose,
}) => {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: -py * 14, ry: px * 14 });
  };

  const handlePointerLeave = () => {
    setTilt({ rx: 0, ry: 0 });
  };

  return (
    <ModalDialog
      open={Boolean(achievement)}
      onClose={onClose}
      labelledBy="achievement-modal-title"
      className="max-w-lg"
    >
      {achievement ? (
        <div className="relative p-6 sm:p-8">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close seal details"
            className="absolute right-4 top-4 inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          {isNewUnlock && (
            <p className="mb-3 text-center text-xs font-medium text-[var(--color-accent)]">
              New seal unlocked
            </p>
          )}

          {/* 3D Tilt Inspection Stage */}
          <div
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            style={{ perspective: '700px' }}
            className="mx-auto my-2 flex w-fit flex-col items-center"
          >
            <motion.div
              animate={{ rotateX: tilt.rx, rotateY: tilt.ry }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="relative flex items-center justify-center p-5"
            >
              {achievement.unlocked && (
                <svg
                  width="166"
                  height="166"
                  viewBox="0 0 166 166"
                  aria-hidden="true"
                  className="halo-spin-anim pointer-events-none absolute inset-0 m-auto opacity-30"
                >
                  <circle
                    cx="83"
                    cy="83"
                    r="70"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="1"
                    strokeDasharray="3 7"
                  />
                  <circle
                    cx="83"
                    cy="83"
                    r="58"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="0.75"
                    strokeDasharray="1 5"
                  />
                </svg>
              )}

              <MedallionIcon
                motif={achievement.definition.motif}
                tier={achievement.definition.tier}
                unlocked={achievement.unlocked}
                size={114}
                label={achievement.definition.title}
              />
            </motion.div>
          </div>

          <div className="mt-2 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-accent)]">
              {!achievement.unlocked && <Lock className="h-3 w-3" aria-hidden="true" />}
              {TIER_LABELS[achievement.definition.tier]}
            </span>

            <h2
              id="achievement-modal-title"
              className="mt-3 font-display text-2xl font-medium tracking-tight text-[var(--text-primary)]"
            >
              {achievement.definition.secret && !achievement.unlocked
                ? 'Hidden Sanctuary Seal'
                : achievement.definition.title}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {achievement.definition.secret && !achievement.unlocked
                ? 'Continue exploring Scripture faithfully to reveal this seal.'
                : achievement.definition.subtitle}
            </p>
          </div>

          <p className="mt-4 text-center text-sm leading-relaxed text-[var(--text-primary)]">
            {achievement.definition.secret && !achievement.unlocked
              ? 'This is a secret milestone waiting in the pages of the Word.'
              : achievement.definition.description}
          </p>

          {(!achievement.definition.secret || achievement.unlocked) && (
            <blockquote className="mt-5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 text-center font-display text-base italic leading-relaxed text-[var(--text-secondary)]">
              {achievement.definition.scriptureEcho}
            </blockquote>
          )}

          <div className="mt-5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary)]">
              <span>Progress</span>
              <span className="tabular-nums font-semibold text-[var(--text-primary)]">
                {achievement.current.toLocaleString()} / {achievement.target.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
              <div
                className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-400"
                style={{ width: `${achievement.percentage}%` }}
              />
            </div>

            {achievement.unlocked && achievement.unlockedAt ? (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--color-sage)]">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Unlocked on {formatPlainDate(achievement.unlockedAt)}</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </ModalDialog>
  );
};
