import React from 'react';

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
      className="shrink-0"
    >
      {active ? (
        <>
          <circle
            cx="24"
            cy="14.5"
            r="10.5"
            fill="var(--color-lamp)"
            opacity="0.16"
            className="lamp-flame-anim"
          />
          <path
            d="M24 6C24 6 29 11.8 29 16C29 19 26.8 21.5 24 21.5C21.2 21.5 19 19 19 16C19 11.8 24 6 24 6Z"
            fill="var(--color-lamp)"
            className="lamp-flame-anim"
          />
          <path
            d="M24 11.5C24 11.5 26.2 14.3 26.2 16.4C26.2 17.8 25.2 19 24 19C22.8 19 21.8 17.8 21.8 16.4C21.8 14.3 24 11.5 24 11.5Z"
            fill="#FFF7DF"
            className="lamp-flame-anim"
          />
        </>
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
