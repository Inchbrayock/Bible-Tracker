import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Lock, X } from 'lucide-react';
import { formatPlainDate } from '../../lib/dates';
import { FOLIO_EASE, SPRING_GENTLE, SPRING_PROGRESS, SPRING_SEAL, TACTILE_PILL_TAP } from '../../lib/motion';
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

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export const AchievementModal: React.FC<AchievementModalProps> = ({
  achievement,
  isNewUnlock = false,
  onClose,
}) => {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 35, gy: 30, active: false });

  const updateTiltFromPoint = (clientX: number, clientY: number, rect: DOMRect) => {
    const px = clamp((clientX - rect.left) / rect.width - 0.5, -0.65, 0.65);
    const py = clamp((clientY - rect.top) / rect.height - 0.5, -0.65, 0.65);
    setTilt({
      rx: -py * 24,
      ry: px * 24,
      gx: 50 + px * 72,
      gy: 50 + py * 72,
      active: true,
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    updateTiltFromPoint(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' && e.buttons === 0 && !tilt.active) return;
    updateTiltFromPoint(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
  };

  const handlePointerReset = () => {
    setTilt({ rx: 0, ry: 0, gx: 35, gy: 30, active: false });
  };

  return (
    <ModalDialog
      open={Boolean(achievement)}
      onClose={onClose}
      labelledBy="achievement-modal-title"
      className="max-w-lg"
    >
      {achievement ? (
        <div
          key={achievement.definition.id}
          className="relative min-h-0 flex-1 overflow-y-auto p-5 pt-6 sm:p-8"
        >
          <motion.button
            type="button"
            whileTap={TACTILE_PILL_TAP}
            onClick={onClose}
            aria-label="Close seal details"
            className="absolute right-4 top-4 inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] sm:min-h-9 sm:min-w-9"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </motion.button>

          {isNewUnlock && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: FOLIO_EASE }}
              className="mb-3 text-center text-xs font-medium text-[var(--color-accent)]"
            >
              New seal unlocked
            </motion.p>
          )}

          {/* 3D Touch & Pointer Specular Inspection Stage */}
          <div
            data-no-sheet-drag
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerReset}
            onPointerLeave={handlePointerReset}
            onPointerCancel={handlePointerReset}
            style={{ perspective: '760px', touchAction: 'none' }}
            className="mx-auto my-2 flex w-fit cursor-grab select-none flex-col items-center active:cursor-grabbing"
          >
            <motion.div
              initial={{ scale: 0.72, rotateY: -22, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                rotateX: tilt.rx,
                rotateY: tilt.ry,
              }}
              transition={tilt.active ? SPRING_GENTLE : SPRING_SEAL}
              style={{ transformStyle: 'preserve-3d' }}
              className="relative flex items-center justify-center p-6"
            >
              {/* Ceremonial arrival light wave on unlocked seals */}
              {achievement.unlocked && (
                <motion.span
                  aria-hidden="true"
                  initial={{ scale: 0.52, opacity: 0.6 }}
                  animate={{ scale: 1.55, opacity: 0 }}
                  transition={{ duration: 0.9, ease: FOLIO_EASE }}
                  className="pointer-events-none absolute h-32 w-32 rounded-full border-2 border-[var(--color-lamp)]"
                />
              )}

              {/* Counter-rotating astrolabe rings */}
              {achievement.unlocked && (
                <>
                  <svg
                    width="174"
                    height="174"
                    viewBox="0 0 174 174"
                    aria-hidden="true"
                    className="halo-spin-anim pointer-events-none absolute inset-0 m-auto opacity-30"
                  >
                    <circle
                      cx="87"
                      cy="87"
                      r="74"
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth="1"
                      strokeDasharray="3 7"
                    />
                  </svg>
                  <svg
                    width="154"
                    height="154"
                    viewBox="0 0 154 154"
                    aria-hidden="true"
                    className="halo-spin-reverse-anim pointer-events-none absolute inset-0 m-auto opacity-25"
                  >
                    <circle
                      cx="77"
                      cy="77"
                      r="61"
                      fill="none"
                      stroke="var(--color-lamp)"
                      strokeWidth="0.9"
                      strokeDasharray="1.5 6"
                    />
                  </svg>
                </>
              )}

              <motion.div
                animate={
                  achievement.unlocked && !tilt.active
                    ? { y: [0, -3, 0] }
                    : { y: 0 }
                }
                transition={
                  achievement.unlocked && !tilt.active
                    ? { duration: 4.4, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.2 }
                }
                className="relative overflow-hidden rounded-full"
              >
                <MedallionIcon
                  motif={achievement.definition.motif}
                  tier={achievement.definition.tier}
                  unlocked={achievement.unlocked}
                  size={116}
                  label={achievement.definition.title}
                />

                {/* Dynamic specular reflection & opening glint sweep */}
                {achievement.unlocked && (
                  <>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-full transition-opacity duration-200"
                      style={{
                        opacity: tilt.active ? 0.42 : 0.16,
                        background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.12) 34%, transparent 66%)`,
                      }}
                    />
                    <span
                      aria-hidden="true"
                      className="sheen-sweep-anim pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0"
                    />
                  </>
                )}
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.06, ease: FOLIO_EASE }}
            className="mt-1 text-center"
          >
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.12, ease: FOLIO_EASE }}
          >
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
                <motion.div
                  className="h-full rounded-full bg-[var(--color-accent)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${achievement.percentage}%` }}
                  transition={SPRING_PROGRESS}
                />
              </div>

              {achievement.unlocked && achievement.unlockedAt ? (
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--color-sage)]">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Unlocked on {formatPlainDate(achievement.unlockedAt)}</span>
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>
      ) : null}
    </ModalDialog>
  );
};
