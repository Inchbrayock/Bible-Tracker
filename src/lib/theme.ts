import type { ColorSchemePreference } from '../types/bible';

const STORAGE_KEY = 'selah-color-scheme';

export function getStoredColorScheme(): ColorSchemePreference {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === 'light' || val === 'dark') return val;
  } catch {
    // localStorage unavailable (private browsing / restricted storage)
  }
  return 'system';
}

export function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function getResolvedColorScheme(pref: ColorSchemePreference): 'light' | 'dark' {
  if (pref === 'light' || pref === 'dark') return pref;
  return getSystemPrefersDark() ? 'dark' : 'light';
}

const LIGHT_THEME_COLOR = '#F7F7F4';
const DARK_THEME_COLOR = '#12151B';

function ensureMeta(name: string, fallbackContent: string): HTMLMetaElement | null {
  if (typeof document === 'undefined') return null;
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta && document.head) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    meta.setAttribute('content', fallbackContent);
    document.head.appendChild(meta);
  }
  return meta;
}

function syncDocumentThemeMeta(pref: ColorSchemePreference): void {
  const colorSchemeMeta = ensureMeta('color-scheme', 'light dark');
  if (colorSchemeMeta) {
    colorSchemeMeta.setAttribute('content', pref === 'system' ? 'light dark' : pref);
  }

  const themeColorMeta = ensureMeta('theme-color', LIGHT_THEME_COLOR);
  if (themeColorMeta) {
    const resolved = getResolvedColorScheme(pref);
    themeColorMeta.setAttribute(
      'content',
      resolved === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR
    );
  }
}

export function applyColorScheme(pref: ColorSchemePreference): void {
  syncDocumentThemeMeta(pref);
  try {
    if (pref === 'system') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, pref);
    }
  } catch {
    // Ignore storage write failure; theme still applies via meta element
  }
}

export function subscribeColorSchemeChanges(
  onChange: (pref: ColorSchemePreference) => void
): () => void {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      const next = getStoredColorScheme();
      syncDocumentThemeMeta(next);
      onChange(next);
    }
  };

  const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
  const handleSystemChange = () => {
    // Only re-notify if user has NOT explicitly pinned light or dark
    if (getStoredColorScheme() === 'system') {
      syncDocumentThemeMeta('system');
      onChange('system');
    }
  };

  window.addEventListener('storage', handleStorage);
  mediaQuery?.addEventListener('change', handleSystemChange);

  return () => {
    window.removeEventListener('storage', handleStorage);
    mediaQuery?.removeEventListener('change', handleSystemChange);
  };
}
