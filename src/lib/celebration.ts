import confetti from 'canvas-confetti';

const SANCTUARY_PALETTE = ['#D4A243', '#E8C678', '#2E6F5E', '#57A78F', '#FAF7F2'];

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function canRenderCanvasConfetti(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext?.('2d'));
  } catch {
    return false;
  }
}

export function celebrateBookCompleted(enabled: boolean): void {
  if (!enabled || prefersReducedMotion() || !canRenderCanvasConfetti()) return;
  void confetti({
    particleCount: 55,
    spread: 68,
    origin: { y: 0.62 },
    colors: SANCTUARY_PALETTE,
    disableForReducedMotion: true,
  });
}

export function celebrateAchievementUnlocked(enabled: boolean, major = false): void {
  if (!enabled || prefersReducedMotion() || !canRenderCanvasConfetti()) return;
  if (major) {
    void confetti({
      particleCount: 95,
      spread: 90,
      origin: { y: 0.55 },
      colors: SANCTUARY_PALETTE,
      disableForReducedMotion: true,
    });
  } else {
    void confetti({
      particleCount: 32,
      spread: 50,
      origin: { y: 0.82, x: 0.85 },
      colors: SANCTUARY_PALETTE,
      disableForReducedMotion: true,
    });
  }
}
