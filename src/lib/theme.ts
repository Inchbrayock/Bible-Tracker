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

function ensureColorSchemeMeta(): HTMLMetaElement | null {
  if (typeof document === 'undefined') return null;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (!meta && document.head) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'color-scheme');
    meta.setAttribute('content', 'light dark');
    document.head.appendChild(meta);
  }
  return meta;
}

export function applyColorScheme(pref: ColorSchemePreference): void {
  const meta = ensureColorSchemeMeta();
  const metaValue = pref === 'system' ? 'light dark' : pref;
  if (meta) {
    meta.setAttribute('content', metaValue);
  }
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
      const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
      if (meta) {
        meta.setAttribute('content', next === 'system' ? 'light dark' : next);
      }
      onChange(next);
    }
  };

  const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
  const handleSystemChange = () => {
    // Only re-notify if user has NOT explicitly pinned light or dark
    if (getStoredColorScheme() === 'system') {
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
