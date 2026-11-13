import React from 'react';
import { motion } from 'motion/react';
import { SPRING_SEAL } from '../../lib/motion';

interface SanctuaryLampProps {
  active: boolean;
  size?: number;
}

export const SanctuaryLamp: React.FC<SanctuaryLampProps> = ({ active, size = 38 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="shrink-0 overflow-visible"
    >
      {active ? (
        <motion.g
          key="lit"
          initial={{ scale: 0.45, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={SPRING_SEAL}
          style={{ transformOrigin: '24px 21px' }}
        >
          {/* Ambient candle halo */}
          <circle
            cx="24"
            cy="14.5"
            r="12"
            fill="var(--color-lamp)"
            opacity="0.18"
            className="lamp-halo-anim"
          />
          {/* Outer swaying amber flame */}
          <path
            d="M24 5.5C24 5.5 29.2 11.6 29.2 16C29.2 19.1 26.9 21.6 24 21.6C21.1 21.6 18.8 19.1 18.8 16C18.8 11.6 24 5.5 24 5.5Z"
            fill="var(--color-lamp)"
            className="lamp-flame-anim"
          />
          {/* Inner incandescent wick core */}
          <path
            d="M24 11.2C24 11.2 26.3 14.2 26.3 16.4C26.3 17.9 25.3 19.1 24 19.1C22.7 19.1 21.7 17.9 21.7 16.4C21.7 14.2 24 11.2 24 11.2Z"
            fill="#FFF7DF"
            className="lamp-core-anim"
          />
          {/* Subtle rising spark */}
          <circle
            cx="24.4"
            cy="8"
            r="1"
            fill="#FFE8A3"
            className="lamp-ember-anim"
          />
        </motion.g>
      ) : (
        <path
          d="M24 17V22.5"
          stroke="var(--text-secondary)"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      )}

      {/* Lamp Vessel */}
      <path
        d="M11.5 26C11.5 24.3 12.8 23 14.5 23H33.5C35.2 23 36.5 24.3 36.5 26C36.5 31.3 31.4 35.5 24 35.5C16.6 35.5 11.5 31.3 11.5 26Z"
        fill={active ? 'var(--color-lamp-soft)' : 'var(--bg-subtle)'}
        stroke={active ? 'var(--color-lamp)' : 'var(--border-strong)'}
        strokeWidth="1.75"
      />
      {/* Handle & Nozzle */}
      <path
        d="M36 25.5H39.5C41.2 25.5 42.5 26.8 42.5 28.5C42.5 30.2 41.2 31.5 39.5 31.5H35"
        stroke={active ? 'var(--color-lamp)' : 'var(--border-strong)'}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M12.5 24.5L8 22.5"
        stroke={active ? 'var(--color-lamp)' : 'var(--border-strong)'}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Pedestal Base */}
      <path
        d="M17.5 40H30.5M20.5 35.5L19.5 40M27.5 35.5L28.5 40"
        stroke={active ? 'var(--color-lamp)' : 'var(--border-strong)'}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
};
