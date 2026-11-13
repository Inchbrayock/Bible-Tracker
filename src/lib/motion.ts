export const FOLIO_EASE = [0.22, 1, 0.36, 1] as const;
export const SHEET_EASE = [0.16, 1, 0.3, 1] as const;

export const SPRING_TACTILE = {
  type: 'spring' as const,
  stiffness: 480,
  damping: 32,
  mass: 0.78,
};

export const SPRING_DOCK = {
  type: 'spring' as const,
  stiffness: 430,
  damping: 30,
  mass: 0.85,
};

export const SPRING_SEAL = {
  type: 'spring' as const,
  stiffness: 340,
  damping: 24,
  mass: 0.9,
};

export const SPRING_GENTLE = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 22,
};

export const SPRING_PROGRESS = {
  type: 'spring' as const,
  stiffness: 190,
  damping: 26,
};

export const TACTILE_TAP = { scale: 0.97 } as const;
export const TACTILE_PILL_TAP = { scale: 0.94 } as const;
