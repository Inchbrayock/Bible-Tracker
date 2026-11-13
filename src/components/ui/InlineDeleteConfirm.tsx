import React from 'react';
import { motion } from 'motion/react';
import { SPRING_TACTILE } from '../../lib/motion';

interface InlineDeleteConfirmProps {
  onCancel: () => void;
  onConfirm: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  describedBy?: string;
  compactOnMobile?: boolean;
  className?: string;
}

/** Compact inline crimson-outlined Cancel/Delete confirmation matching Log History rows. */
export const InlineDeleteConfirm: React.FC<InlineDeleteConfirmProps> = ({
  onCancel,
  onConfirm,
  cancelLabel = 'Cancel',
  confirmLabel = 'Delete',
  describedBy,
  compactOnMobile = false,
  className = '',
}) => {
  const padClass = compactOnMobile ? 'px-1.5 sm:px-2' : 'px-2';
  const gapClass = compactOnMobile ? 'gap-1 sm:gap-1.5' : 'gap-1.5';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING_TACTILE}
      className={`inline-flex items-center rounded-md border border-[var(--color-crimson)] bg-[var(--bg-elevated)] p-1 text-xs ${gapClass} ${className}`}
    >
      <button
        type="button"
        onClick={onCancel}
        aria-describedby={describedBy}
        className={`min-h-8 rounded text-[var(--text-secondary)] hover:underline ${padClass}`}
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        aria-describedby={describedBy}
        className={`min-h-8 rounded font-semibold text-[var(--color-crimson)] hover:underline ${padClass}`}
      >
        {confirmLabel}
      </button>
    </motion.div>
  );
};
