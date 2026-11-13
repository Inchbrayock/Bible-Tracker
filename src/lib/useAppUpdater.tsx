import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  canSafelyAutoApplyUpdate,
  checkWebVersionUpdate,
  compareVersions,
  fetchLatestAndroidRelease,
  getAutoUpdateEnabled,
  getBundledAppVersion,
  getDismissedUpdateVersion,
  getInstalledAppInfo,
  getSelahUpdaterPlugin,
  hasAutoReloadedForVersion,
  isAndroidNativeApp,
  isRemoteReleaseNewer,
  markAutoReloadedForVersion,
  setAutoUpdateEnabled as persistAutoUpdateEnabled,
  setDismissedUpdateVersion,
  type RemoteReleaseInfo,
} from './appUpdater';
import { isNativePlatform } from './nativeShell';

const AUTO_CHECK_INTERVAL_MS = 30 * 60 * 1000;

export type AppUpdateStatus =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'downloading'
  | 'ready'
  | 'installing'
  | 'reloading'
  | 'error';

export interface AvailableUpdateInfo {
  version: string;
  versionCode?: number;
  apkName?: string;
  releaseUrl?: string;
  localPath?: string;
}

export interface AppUpdaterContextValue {
  currentVersion: string;
  currentBuild: number | null;
  isAndroidNative: boolean;
  autoUpdateEnabled: boolean;
  setAutoUpdateEnabled: (enabled: boolean) => void;
  status: AppUpdateStatus;
  downloadProgress: number | null;
  availableUpdate: AvailableUpdateInfo | null;
  needsInstallPermission: boolean;
  bannerDismissed: boolean;
  errorMessage: string | null;
  checkForUpdates: (options?: { manual?: boolean }) => Promise<void>;
  applyUpdate: () => Promise<void>;
  dismissBanner: () => void;
}

const AppUpdaterContext = createContext<AppUpdaterContextValue | null>(null);

function isTestRuntime(): boolean {
  return import.meta.env.MODE === 'test';
}

export const AppUpdaterProvider: React.FC<{
  ready: boolean;
  children: React.ReactNode;
}> = ({ ready, children }) => {
  const isAndroidNative = isAndroidNativeApp();

  const [currentVersion, setCurrentVersion] = useState<string>(getBundledAppVersion);
  const [currentBuild, setCurrentBuild] = useState<number | null>(null);
  const [autoUpdateEnabled, setAutoUpdateEnabledState] = useState<boolean>(getAutoUpdateEnabled);
  const [status, setStatus] = useState<AppUpdateStatus>('idle');
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [availableUpdate, setAvailableUpdate] = useState<AvailableUpdateInfo | null>(null);
  const [needsInstallPermission, setNeedsInstallPermission] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const autoUpdateRef = useRef(autoUpdateEnabled);
  autoUpdateRef.current = autoUpdateEnabled;
  const lastCheckAtRef = useRef<number>(0);
  const checkInFlightRef = useRef<Promise<void> | null>(null);
  const downloadedPathRef = useRef<{ version: string; path: string } | null>(null);
  const autoPromptedVersionRef = useRef<string | null>(null);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  const setAutoUpdateEnabled = useCallback((enabled: boolean) => {
    persistAutoUpdateEnabled(enabled);
    setAutoUpdateEnabledState(enabled);
  }, []);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    if (availableUpdate?.version) {
      setDismissedUpdateVersion(availableUpdate.version);
      autoPromptedVersionRef.current = availableUpdate.version;
    }
  }, [availableUpdate?.version]);

  const installAndroidUpdate = useCallback(
    async (apkPath: string, version: string, isAutomaticPrompt: boolean) => {
      if (!isAndroidNative || !Capacitor.isPluginAvailable('SelahUpdater')) return;
      const updater = getSelahUpdaterPlugin();

      if (isAutomaticPrompt) {
        const perm = await updater.canRequestPackageInstalls();
        setNeedsInstallPermission(!perm.granted);
        if (!perm.granted || !canSafelyAutoApplyUpdate()) {
          setStatus('ready');
          return;
        }
        autoPromptedVersionRef.current = version;
      }

      setStatus('installing');
      setErrorMessage(null);
      try {
        const res = await updater.installDownloadedApk({ path: apkPath });
        setNeedsInstallPermission(res.needsPermission);
        setStatus('ready');
      } catch (err) {
        setStatus('error');
        setErrorMessage(
          err instanceof Error ? err.message : 'Unable to launch the Android update installer.'
        );
      }
    },
    [isAndroidNative]
  );

  const runAndroidDownloadAndPrepare = useCallback(
    async (
      release: RemoteReleaseInfo,
      manual: boolean,
      currentVer: string,
      currentBld: number | null
    ) => {
      if (!Capacitor.isPluginAvailable('SelahUpdater')) return;
      const updater = getSelahUpdaterPlugin();

      setAvailableUpdate({
        version: release.version,
        versionCode: release.versionCode,
        apkName: release.apkName,
        releaseUrl: release.releaseUrl,
      });

      const dismissed = getDismissedUpdateVersion();
      if (!manual && dismissed && compareVersions(dismissed, release.version) >= 0) {
        setBannerDismissed(true);
      } else {
        setBannerDismissed(false);
      }

      if (
        downloadedPathRef.current &&
        downloadedPathRef.current.version === release.version &&
        isRemoteReleaseNewer(currentVer, currentBld, release)
      ) {
        setAvailableUpdate({
          version: release.version,
          versionCode: release.versionCode,
          apkName: release.apkName,
          releaseUrl: release.releaseUrl,
          localPath: downloadedPathRef.current.path,
        });
        setStatus('ready');
        return;
      }

      setStatus('downloading');
      setDownloadProgress(0);

      const listener = await updater.addListener('downloadProgress', (evt) => {
        if (evt.progress >= 0) {
          setDownloadProgress(evt.progress);
        }
      });

      try {
        const downloaded = await updater.downloadAndVerifyApk({
          url: release.apkUrl,
          expectedSha256: release.sha256,
          minVersionCode: release.versionCode,
          fileName: release.apkName,
        });

        downloadedPathRef.current = { version: release.version, path: downloaded.path };
        setDownloadProgress(100);
        setAvailableUpdate({
          version: release.version,
          versionCode: downloaded.versionCode || release.versionCode,
          apkName: release.apkName,
          releaseUrl: release.releaseUrl,
          localPath: downloaded.path,
        });

        const shouldAutoPrompt =
          !manual &&
          autoUpdateRef.current &&
          (!dismissed || compareVersions(dismissed, release.version) < 0) &&
          autoPromptedVersionRef.current !== release.version;

        await installAndroidUpdate(downloaded.path, release.version, shouldAutoPrompt);
        if (!shouldAutoPrompt) {
          const perm = await updater.canRequestPackageInstalls();
          setNeedsInstallPermission(!perm.granted);
          setStatus('ready');
        }
      } finally {
        await listener.remove();
      }
    },
    [installAndroidUpdate]
  );

  const checkForUpdates = useCallback(
    async (options?: { manual?: boolean }) => {
      const manual = Boolean(options?.manual);
      if (checkInFlightRef.current) {
        return checkInFlightRef.current;
      }

      const now = Date.now();
      if (!manual && now - lastCheckAtRef.current < AUTO_CHECK_INTERVAL_MS) {
        return;
      }

      const run = async () => {
        lastCheckAtRef.current = Date.now();
        if (manual) {
          setDismissedUpdateVersion(null);
          setBannerDismissed(false);
          setErrorMessage(null);
          setStatus('checking');
        }

        try {
          const info = await getInstalledAppInfo();
          setCurrentVersion(info.version);
          setCurrentBuild(info.build);

          if (isAndroidNativeApp()) {
            const release = await fetchLatestAndroidRelease();
            if (!release || !isRemoteReleaseNewer(info.version, info.build, release)) {
              setAvailableUpdate(null);
              setStatus(manual ? 'up-to-date' : 'idle');
              return;
            }

            if (!manual && !autoUpdateRef.current) {
              return;
            }

            await runAndroidDownloadAndPrepare(release, manual, info.version, info.build);
            return;
          }

          // Web / iPhone Safari PWA check
          if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration('/sw.js');
            if (registration) {
              await registration.update().catch(() => {});
              if (registration.waiting) {
                waitingWorkerRef.current = registration.waiting;
              }
            }
          }

          const remoteVersion = await checkWebVersionUpdate();
          const hasWaitingWorker = waitingWorkerRef.current !== null;
          const isNewerWeb =
            (remoteVersion !== null && compareVersions(remoteVersion, info.version) > 0) ||
            hasWaitingWorker;

          if (!isNewerWeb) {
            setAvailableUpdate(null);
            setStatus(manual ? 'up-to-date' : 'idle');
            return;
          }

          const targetVersion = remoteVersion ?? info.version;
          const dismissed = getDismissedUpdateVersion();
          setAvailableUpdate({ version: targetVersion });
          setBannerDismissed(!manual && dismissed === targetVersion);

          if (waitingWorkerRef.current) {
            waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' });
          }

          if (
            !manual &&
            autoUpdateRef.current &&
            dismissed !== targetVersion &&
            canSafelyAutoApplyUpdate() &&
            !hasAutoReloadedForVersion(targetVersion)
          ) {
            markAutoReloadedForVersion(targetVersion);
            setStatus('reloading');
            window.location.reload();
            return;
          }

          setStatus('ready');
        } catch (err) {
          if (manual) {
            setStatus('error');
            setErrorMessage(
              err instanceof Error ? err.message : 'Unable to check for updates right now.'
            );
          } else {
            setStatus((prev) => (prev === 'ready' ? 'ready' : 'idle'));
          }
        }
      };

      const promise = run().finally(() => {
        checkInFlightRef.current = null;
      });
      checkInFlightRef.current = promise;
      return promise;
    },
    [runAndroidDownloadAndPrepare]
  );

  const applyUpdate = useCallback(async () => {
    if (isAndroidNativeApp()) {
      if (availableUpdate?.localPath) {
        await installAndroidUpdate(availableUpdate.localPath, availableUpdate.version, false);
        return;
      }
      await checkForUpdates({ manual: true });
      return;
    }

    if (waitingWorkerRef.current) {
      waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' });
    }
    if (availableUpdate?.version) {
      markAutoReloadedForVersion(availableUpdate.version);
    }
    setStatus('reloading');
    window.location.reload();
  }, [availableUpdate, checkForUpdates, installAndroidUpdate]);

  // Load installed app metadata & run cleanup / startup check
  useEffect(() => {
    let active = true;
    void getInstalledAppInfo().then((info) => {
      if (!active) return;
      setCurrentVersion(info.version);
      setCurrentBuild(info.build);
    });

    if (isAndroidNativeApp() && Capacitor.isPluginAvailable('SelahUpdater')) {
      void getSelahUpdaterPlugin()
        .clearObsoleteUpdates()
        .catch(() => {});
    }

    return () => {
      active = false;
    };
  }, []);

  // Trigger automatic update check once initial data is ready (skipped in Vitest test mode)
  useEffect(() => {
    if (!ready || isTestRuntime()) return;
    if (!autoUpdateRef.current) return;
    const timer = window.setTimeout(() => {
      void checkForUpdates({ manual: false });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [ready, checkForUpdates]);

  // Foreground resume checks on Android native and Web/Safari PWA
  useEffect(() => {
    if (!ready || isTestRuntime()) return;

    if (isNativePlatform()) {
      let disposed = false;
      let handle: { remove: () => Promise<void> } | null = null;
      void import('@capacitor/app')
        .then(async ({ App }) => {
          if (disposed) return;
          const listener = await App.addListener('appStateChange', ({ isActive }) => {
            if (isActive && autoUpdateRef.current) {
              void checkForUpdates({ manual: false });
            }
          });
          if (disposed) {
            await listener.remove();
            return;
          }
          handle = listener;
        })
        .catch(() => {});

      return () => {
        disposed = true;
        if (handle) {
          void handle.remove();
        }
      };
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && autoUpdateRef.current) {
        void checkForUpdates({ manual: false });
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    let hadController = Boolean(navigator.serviceWorker?.controller);
    const onControllerChange = () => {
      if (!hadController) {
        hadController = true;
        return;
      }
      if (
        autoUpdateRef.current &&
        canSafelyAutoApplyUpdate() &&
        !hasAutoReloadedForVersion('sw-controller')
      ) {
        markAutoReloadedForVersion('sw-controller');
        setStatus('reloading');
        window.location.reload();
      } else {
        setAvailableUpdate((prev) => prev ?? { version: currentVersion });
        setBannerDismissed(false);
        setStatus('ready');
      }
    };

    const sw = navigator.serviceWorker;
    sw?.addEventListener('controllerchange', onControllerChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      sw?.removeEventListener('controllerchange', onControllerChange);
    };
  }, [ready, checkForUpdates, currentVersion]);

  const value: AppUpdaterContextValue = {
    currentVersion,
    currentBuild,
    isAndroidNative,
    autoUpdateEnabled,
    setAutoUpdateEnabled,
    status,
    downloadProgress,
    availableUpdate,
    needsInstallPermission,
    bannerDismissed,
    errorMessage,
    checkForUpdates,
    applyUpdate,
    dismissBanner,
  };

  return <AppUpdaterContext.Provider value={value}>{children}</AppUpdaterContext.Provider>;
};

export function useAppUpdater(): AppUpdaterContextValue {
  const ctx = useContext(AppUpdaterContext);
  if (!ctx) {
    throw new Error('useAppUpdater must be used inside AppUpdaterProvider');
  }
  return ctx;
}
