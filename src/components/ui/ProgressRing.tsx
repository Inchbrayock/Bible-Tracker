import React, { useId } from 'react';
import { motion } from 'motion/react';

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  sublabel?: string;
  accentColor?: string;
  secondaryColor?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  max,
  size = 132,
  strokeWidth = 10,
  label,
  sublabel,
  accentColor = 'var(--color-accent)',
  secondaryColor = 'var(--color-sage)',
}) => {
  const gradId = useId();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const pct = (ratio * 100).toFixed(ratio > 0 && ratio < 0.1 ? 1 : 0);

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label}: ${value} of ${max} chapters (${pct}%)`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accentColor} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-subtle)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - ratio) }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        <span className="font-display text-2xl font-semibold tracking-tight tabular-nums leading-none">
          {pct}%
        </span>
        <span className="mt-1 text-xs font-medium text-[var(--text-secondary)] tabular-nums">
          {value.toLocaleString()} / {max.toLocaleString()}
        </span>
        {sublabel ? (
          <span className="text-[0.68rem] uppercase tracking-wider text-[var(--text-secondary)]">
            {sublabel}
          </span>
        ) : null}
      </div>
    </div>
  );
};
