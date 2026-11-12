import React from 'react';

interface SanctuaryLampProps {
  active: boolean;
  size?: number;
}

export const SanctuaryLamp: React.FC<SanctuaryLampProps> = ({ active, size = 40 }) => {
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
            cy="15"
            r="12"
            fill="var(--color-accent)"
            opacity="0.16"
            className="lamp-flame-anim"
          />
          <path
            d="M24 6C24 6 29.5 12.2 29.5 16.5C29.5 19.6 27 22 24 22C21 22 18.5 19.6 18.5 16.5C18.5 12.2 24 6 24 6Z"
            fill="var(--color-accent)"
            className="lamp-flame-anim"
          />
          <path
            d="M24 11.5C24 11.5 26.5 14.5 26.5 16.7C26.5 18.2 25.4 19.4 24 19.4C22.6 19.4 21.5 18.2 21.5 16.7C21.5 14.5 24 11.5 24 11.5Z"
            fill="#FFF7DE"
            className="lamp-flame-anim"
          />
        </>
      ) : (
        <path
          d="M24 17V22"
          stroke="var(--text-secondary)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}

      {/* Brass Sanctuary Oil Lamp Body */}
      <path
        d="M11 26C11 24.3 12.3 23 14 23H34C35.7 23 37 24.3 37 26C37 31.5 31.8 36 24 36C16.2 36 11 31.5 11 26Z"
        fill={active ? 'var(--color-accent-soft)' : 'var(--bg-subtle)'}
        stroke={active ? 'var(--color-accent)' : 'var(--border-strong)'}
        strokeWidth="2"
      />
      {/* Handle & Spout */}
      <path
        d="M36.5 25.5H40C41.7 25.5 43 26.8 43 28.5C43 30.2 41.7 31.5 40 31.5H35.5"
        stroke={active ? 'var(--color-accent)' : 'var(--border-strong)'}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12.5 24.5L7.5 22.5"
        stroke={active ? 'var(--color-accent)' : 'var(--border-strong)'}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Base */}
      <path
        d="M17 40H31M20 36L19 40M28 36L29 40"
        stroke={active ? 'var(--color-accent)' : 'var(--border-strong)'}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};
