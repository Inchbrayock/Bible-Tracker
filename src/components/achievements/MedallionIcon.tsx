import React, { useId } from 'react';
import type { AchievementMotif, AchievementTier } from '../../types/bible';

interface MedallionIconProps {
  motif: AchievementMotif;
  tier: AchievementTier;
  unlocked: boolean;
  size?: number;
  label?: string;
}

const TIER_COLORS: Record<
  AchievementTier,
  { ringStart: string; ringEnd: string; faceStart: string; faceEnd: string; ink: string }
> = {
  bronze: {
    ringStart: '#D4945A',
    ringEnd: '#8B5428',
    faceStart: '#4E311B',
    faceEnd: '#2E1C0E',
    ink: '#FBE4C8',
  },
  silver: {
    ringStart: '#E5ECF2',
    ringEnd: '#8998A8',
    faceStart: '#2A3542',
    faceEnd: '#192028',
    ink: '#F2F7FC',
  },
  gold: {
    ringStart: '#F9DB83',
    ringEnd: '#B87E14',
    faceStart: '#423010',
    faceEnd: '#241907',
    ink: '#FFF3CC',
  },
  luminous: {
    ringStart: '#FDE7A2',
    ringEnd: '#46A48C',
    faceStart: '#17332C',
    faceEnd: '#151B2E',
    ink: '#FFF8DF',
  },
};

function renderMotifPaths(motif: AchievementMotif, stroke: string) {
  switch (motif) {
    case 'scroll':
      return (
        <>
          <path
            d="M21 20H37C38.6 20 40 21.3 40 23V41C40 42.6 38.6 44 37 44H21C19.3 44 18 42.6 18 41V23C18 21.3 19.3 20 21 20Z"
            stroke={stroke}
            strokeWidth="2.2"
            fill="none"
          />
          <path
            d="M15 24C15 21.8 16.8 20 19 20M43 40C43 42.2 41.2 44 39 44M23 27H35M23 32H35M23 37H31"
            stroke={stroke}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </>
      );
    case 'lamp':
      return (
        <>
          <path
            d="M32 15C32 15 36.5 19.8 36.5 23C36.5 25.5 34.5 27.5 32 27.5C29.5 27.5 27.5 25.5 27.5 23C27.5 19.8 32 15 32 15Z"
            stroke={stroke}
            strokeWidth="2.2"
            fill={stroke}
            fillOpacity="0.22"
          />
          <path
            d="M21 31H42C42 36.5 37.5 40 31.5 40C25.5 40 21 36.5 21 31ZM25 45H39"
            stroke={stroke}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
    case 'crown':
      return (
        <path
          d="M18 40L16 24L25 31L32 20L39 31L48 24L46 40H18ZM18 44H46"
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={stroke}
          fillOpacity="0.16"
        />
      );
    case 'tablets':
      return (
        <>
          <path
            d="M19 43V26C19 22 22 19 25.5 19C29 19 31 21.5 31 25V43H19Z"
            stroke={stroke}
            strokeWidth="2.1"
            fill={stroke}
            fillOpacity="0.12"
          />
          <path
            d="M33 43V26C33 22 35.5 19 39 19C42.5 19 45 22 45 26V43H33Z"
            stroke={stroke}
            strokeWidth="2.1"
            fill={stroke}
            fillOpacity="0.12"
          />
          <path
            d="M23 26H27M23 31H27M23 36H27M37 26H41M37 31H41M37 36H41"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      );
    case 'harp':
      return (
        <>
          <path
            d="M22 44V20C27 18 35 20 42 25C44 26.5 44 30 41 33L28 44H22Z"
            stroke={stroke}
            strokeWidth="2.2"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M26 22V41M30 22V39M34 24V36M38 26V33"
            stroke={stroke}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      );
    case 'flame':
      return (
        <path
          d="M32 15C32 15 43 24.5 43 33.5C43 40 38.1 45 32 45C25.9 45 21 40 21 33.5C21 29.5 23 25.5 25.5 23C25.5 26 27.5 27.5 29 27.5C28 23.5 29.5 18.5 32 15Z"
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinejoin="round"
          fill={stroke}
          fillOpacity="0.2"
        />
      );
    case 'dove':
      return (
        <path
          d="M44 23C39 23 35 26 32 29C29 23 24 19 18 20C21 24 21 29 25 33C22 36 18 38 16 39C21 42 28 42 33 38C38 35 41 31 44 27L47 25L44 23Z"
          stroke={stroke}
          strokeWidth="2.1"
          strokeLinejoin="round"
          fill={stroke}
          fillOpacity="0.18"
        />
      );
    case 'compass':
      return (
        <>
          <circle cx="32" cy="32" r="14" stroke={stroke} strokeWidth="2.1" />
          <path
            d="M37 27L34 34L27 37L30 30L37 27Z"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
            fill={stroke}
            fillOpacity="0.24"
          />
        </>
      );
    case 'quill':
      return (
        <path
          d="M44 17C34 18 25 26 21 37L18 45L26 42C36 38 43 29 44 17ZM21 37L34 25"
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={stroke}
          fillOpacity="0.14"
        />
      );
    case 'sunrise':
      return (
        <>
          <path
            d="M17 38H47M22 38C22 32.5 26.5 28 32 28C37.5 28 42 32.5 42 38"
            stroke={stroke}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M32 17V23M21 22L24.5 25.5M43 22L39.5 25.5M17 31H20M44 31H47"
            stroke={stroke}
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </>
      );
    case 'moon':
      return (
        <>
          <path
            d="M37 41.5C30.2 41.5 24.5 35.8 24.5 29C24.5 24.7 26.7 21 30 18.8C23.5 19.6 18.5 25.1 18.5 31.8C18.5 39 24.3 44.8 31.5 44.8C35.8 44.8 39.7 42.7 42 39.4C40.5 40.7 38.8 41.5 37 41.5Z"
            stroke={stroke}
            strokeWidth="2.2"
            fill={stroke}
            fillOpacity="0.2"
          />
          <path
            d="M39 20L40.2 22.8L43 24L40.2 25.2L39 28L37.8 25.2L35 24L37.8 22.8L39 20Z"
            fill={stroke}
          />
        </>
      );
    case 'star':
      return (
        <path
          d="M32 16L35.8 26.8L47 28L38.4 35.2L41.2 46L32 40L22.8 46L25.6 35.2L17 28L28.2 26.8L32 16Z"
          stroke={stroke}
          strokeWidth="2.1"
          strokeLinejoin="round"
          fill={stroke}
          fillOpacity="0.22"
        />
      );
    case 'shield':
      return (
        <>
          <path
            d="M32 17L44 22V32C44 39.2 38.5 44.2 32 46.5C25.5 44.2 20 39.2 20 32V22L32 17Z"
            stroke={stroke}
            strokeWidth="2.2"
            strokeLinejoin="round"
            fill={stroke}
            fillOpacity="0.16"
          />
          <path d="M32 23V39M26 29H38" stroke={stroke} strokeWidth="2.1" strokeLinecap="round" />
        </>
      );
    case 'chalice':
      return (
        <path
          d="M22 19H42V25C42 30.5 37.5 35 32 35C26.5 35 22 30.5 22 25V19ZM32 35V44M25 44H39"
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={stroke}
          fillOpacity="0.16"
        />
      );
    case 'alpha-omega':
      return (
        <g stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M18 40L24 22L30 40M20 35H28" />
          <path d="M35 40H38.5C36 37 35 33.5 35 30C35 25.5 37.8 22 41.5 22C45.2 22 48 25.5 48 30C48 33.5 47 37 44.5 40H48" />
        </g>
      );
  }
}

export const MedallionIcon: React.FC<MedallionIconProps> = ({
  motif,
  tier,
  unlocked,
  size = 64,
  label,
}) => {
  const uid = useId();
  const palette = TIER_COLORS[tier];
  const stroke = unlocked ? palette.ink : 'var(--text-secondary)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="shrink-0 drop-shadow-sm"
    >
      <defs>
        <linearGradient id={`${uid}-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={palette.ringStart} />
          <stop offset="100%" stopColor={palette.ringEnd} />
        </linearGradient>
        <radialGradient id={`${uid}-face`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={palette.faceStart} />
          <stop offset="100%" stopColor={palette.faceEnd} />
        </radialGradient>
      </defs>

      {/* Scalloped outer wax/filigree rim */}
      <circle
        cx="32"
        cy="32"
        r="29"
        fill={unlocked ? `url(#${uid}-ring)` : 'var(--bg-subtle)'}
        stroke={unlocked ? 'none' : 'var(--border-strong)'}
        strokeWidth="1.5"
        strokeDasharray={unlocked ? undefined : '4 3'}
      />

      {/* Inner engraved ring */}
      <circle
        cx="32"
        cy="32"
        r="24.5"
        fill={unlocked ? `url(#${uid}-face)` : 'var(--bg-surface)'}
        stroke={unlocked ? palette.ringStart : 'var(--border-subtle)'}
        strokeWidth="1.2"
        strokeOpacity={unlocked ? 0.65 : 1}
      />

      {/* Cardinal filigree dots */}
      {unlocked && (
        <g fill={palette.ringStart} opacity="0.85">
          <circle cx="32" cy="9.5" r="1.4" />
          <circle cx="54.5" cy="32" r="1.4" />
          <circle cx="32" cy="54.5" r="1.4" />
          <circle cx="9.5" cy="32" r="1.4" />
        </g>
      )}

      <g opacity={unlocked ? 1 : 0.42}>{renderMotifPaths(motif, stroke)}</g>
    </svg>
  );
};
