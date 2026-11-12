import { Capacitor } from '@capacitor/core';

export type NativeHapticKind = 'tap' | 'milestone' | 'success';

export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getNativePlatform(): 'web' | 'ios' | 'android' {
  try {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios' || platform === 'android') {
      return platform;
    }
    return 'web';
  } catch {
    return 'web';
  }
}

export async function syncNativeStatusBar(resolvedScheme: 'light' | 'dark'): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({
      style: resolvedScheme === 'dark' ? Style.Dark : Style.Light,
    });
    if (getNativePlatform() === 'android') {
      await StatusBar.setBackgroundColor({
        color: resolvedScheme === 'dark' ? '#12151B' : '#F7F7F4',
      });
    }
  } catch {
    // Ignore when StatusBar plugin is unavailable or unsupported (e.g., Android 15 edge-to-edge)
  }
}

export async function hideNativeSplashScreen(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    // Ignore if splash screen is already dismissed or unavailable
  }
}

export async function triggerNativeHaptic(kind: NativeHapticKind): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    if (kind === 'success') {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (kind === 'milestone') {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
  } catch {
    // Ignore unsupported haptic hardware errors
  }
}

/**
 * Registers an Android hardware back-button interceptor.
 * If `onBack()` returns true, the back press is consumed; otherwise Capacitor exits or pops history.
 */
export function subscribeNativeBackButton(onBack: () => boolean): () => void {
  if (getNativePlatform() !== 'android') {
    return () => {};
  }

  let disposed = false;
  let listenerHandle: { remove: () => Promise<void> } | null = null;

  void import('@capacitor/app')
    .then(async ({ App }) => {
      if (disposed) return;
      const handle = await App.addListener('backButton', ({ canGoBack }) => {
        if (onBack()) return;
        if (canGoBack) {
          window.history.back();
        } else {
          void App.exitApp();
        }
      });
      if (disposed) {
        await handle.remove();
        return;
      }
      listenerHandle = handle;
    })
    .catch(() => {
      // Ignore if App plugin is unavailable
    });

  return () => {
    disposed = true;
    if (listenerHandle) {
      void listenerHandle.remove();
      listenerHandle = null;
    }
  };
}
