import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  compareVersions,
  isRemoteReleaseNewer,
  isTrustedGitHubApkUrl,
  parseReleasePayload,
} from '../lib/appUpdater';

const updaterMock = vi.hoisted(() => ({
  isNative: false,
  platform: 'web' as 'web' | 'android',
  pluginAvailable: false,
  appGetInfo: vi.fn(async () => ({
    name: 'Selah',
    id: 'com.selah.bible',
    version: '1.2.0',
    build: '2',
  })),
  fetchReleaseManifest: vi.fn(),
  canRequestPackageInstalls: vi.fn(async () => ({ granted: true })),
  downloadAndVerifyApk: vi.fn(),
  installDownloadedApk: vi.fn(async () => ({ started: true, needsPermission: false })),
  clearObsoleteUpdates: vi.fn(async () => ({ deletedCount: 0 })),
  progressListener: null as null | ((event: { progress: number; bytesDownloaded: number; totalBytes: number }) => void),
}));

vi.mock('../lib/nativeShell', () => ({
  isNativePlatform: () => updaterMock.isNative,
  getNativePlatform: () => updaterMock.platform,
  syncNativeStatusBar: vi.fn(async () => {}),
  hideNativeSplashScreen: vi.fn(async () => {}),
  triggerNativeHaptic: vi.fn(async () => {}),
  subscribeNativeBackButton: vi.fn(() => () => {}),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => updaterMock.isNative,
    getPlatform: () => updaterMock.platform,
    isPluginAvailable: () => updaterMock.pluginAvailable,
  },
  registerPlugin: () => ({
    fetchReleaseManifest: updaterMock.fetchReleaseManifest,
    canRequestPackageInstalls: updaterMock.canRequestPackageInstalls,
    downloadAndVerifyApk: updaterMock.downloadAndVerifyApk,
    installDownloadedApk: updaterMock.installDownloadedApk,
    clearObsoleteUpdates: updaterMock.clearObsoleteUpdates,
    addListener: vi.fn(
      async (
        _eventName: string,
        cb: (event: { progress: number; bytesDownloaded: number; totalBytes: number }) => void
      ) => {
        updaterMock.progressListener = cb;
        return { remove: vi.fn(async () => {}) };
      }
    ),
  }),
}));

vi.mock('@capacitor/app', () => ({
  App: {
    getInfo: updaterMock.appGetInfo,
    addListener: vi.fn(async () => ({ remove: vi.fn(async () => {}) })),
  },
}));

import { AppUpdaterProvider, useAppUpdater } from '../lib/useAppUpdater';
import { UpdateBanner } from '../components/ui/UpdateBanner';

const TestUpdaterControls: React.FC = () => {
  const {
    currentVersion,
    currentBuild,
    autoUpdateEnabled,
    setAutoUpdateEnabled,
    status,
    checkForUpdates,
    errorMessage,
  } = useAppUpdater();

  return (
    <div>
      <span data-testid="ver">
        {currentVersion}:{currentBuild ?? 'web'}
      </span>
      <span data-testid="status">{status}</span>
      {errorMessage && <span data-testid="err">{errorMessage}</span>}
      <label>
        <input
          type="checkbox"
          aria-label="Automatic updates"
          checked={autoUpdateEnabled}
          onChange={(e) => setAutoUpdateEnabled(e.target.checked)}
        />
      </label>
      <button type="button" onClick={() => void checkForUpdates({ manual: true })}>
        Check updates
      </button>
    </div>
  );
};

describe('appUpdater logic and UI', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    updaterMock.isNative = false;
    updaterMock.platform = 'web';
    updaterMock.pluginAvailable = false;
    updaterMock.progressListener = null;
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('compares semantic versions and Android build numbers accurately', () => {
    expect(compareVersions('v1.10.0', '1.2.0')).toBeGreaterThan(0);
    expect(compareVersions('1.3.0', '1.3.0-beta.1')).toBeGreaterThan(0);
    expect(compareVersions('1.2.0', '1.2.0')).toBe(0);

    expect(
      isRemoteReleaseNewer('1.2.0', 2, { version: '1.3.0', versionCode: 3 })
    ).toBe(true);
    expect(
      isRemoteReleaseNewer('1.3.0', 2, { version: '1.3.0', versionCode: 3 })
    ).toBe(true);
    expect(
      isRemoteReleaseNewer('1.3.0', 3, { version: '1.3.0', versionCode: 3 })
    ).toBe(false);
  });

  it('validates trusted GitHub URLs and parses update.json and GitHub Release API payloads', () => {
    expect(
      isTrustedGitHubApkUrl(
        'https://github.com/Inchbrayock/Selah/releases/download/v1.3.0/Selah-v1.3.0-3-release.apk'
      )
    ).toBe(true);
    expect(
      isTrustedGitHubApkUrl('https://github.com/other/repo/releases/download/v1.0.0/app.apk')
    ).toBe(false);
    expect(isTrustedGitHubApkUrl('http://github.com/Inchbrayock/Selah/app.apk')).toBe(
      false
    );

    const manifest = parseReleasePayload(
      JSON.stringify({
        version: 'v1.3.0',
        versionCode: 3,
        apkName: 'Selah-v1.3.0-3-release.apk',
        apkUrl:
          'https://github.com/Inchbrayock/Selah/releases/download/v1.3.0/Selah-v1.3.0-3-release.apk',
        sha256: 'a'.repeat(64),
      })
    );
    expect(manifest).toEqual({
      version: '1.3.0',
      versionCode: 3,
      apkName: 'Selah-v1.3.0-3-release.apk',
      apkUrl:
        'https://github.com/Inchbrayock/Selah/releases/download/v1.3.0/Selah-v1.3.0-3-release.apk',
      sha256: 'a'.repeat(64),
      releaseUrl: undefined,
    });

    const githubRelease = parseReleasePayload(
      JSON.stringify({
        tag_name: 'v1.4.0',
        html_url: 'https://github.com/Inchbrayock/Selah/releases/tag/v1.4.0',
        assets: [
          {
            name: 'Selah-v1.4.0-4-debug.apk',
            browser_download_url:
              'https://github.com/Inchbrayock/Selah/releases/download/v1.4.0/Selah-v1.4.0-4-debug.apk',
          },
          {
            name: 'Selah-v1.4.0-4-release.apk',
            browser_download_url:
              'https://github.com/Inchbrayock/Selah/releases/download/v1.4.0/Selah-v1.4.0-4-release.apk',
            digest: `sha256:${'B'.repeat(64)}`,
          },
        ],
      })
    );
    expect(githubRelease?.apkName).toBe('Selah-v1.4.0-4-release.apk');
    expect(githubRelease?.versionCode).toBe(4);
    expect(githubRelease?.sha256).toBe('b'.repeat(64));
  });

  it('downloads and installs an Android update on manual check, and supports permission prompts', async () => {
    updaterMock.isNative = true;
    updaterMock.platform = 'android';
    updaterMock.pluginAvailable = true;
    updaterMock.canRequestPackageInstalls.mockResolvedValue({ granted: false });
    updaterMock.fetchReleaseManifest.mockResolvedValue({
      status: 200,
      url: 'https://github.com/Inchbrayock/Selah/releases/latest/download/update.json',
      body: JSON.stringify({
        version: '1.3.0',
        versionCode: 3,
        apkName: 'Selah-v1.3.0-3-release.apk',
        apkUrl:
          'https://github.com/Inchbrayock/Selah/releases/download/v1.3.0/Selah-v1.3.0-3-release.apk',
        sha256: 'c'.repeat(64),
      }),
    });
    updaterMock.downloadAndVerifyApk.mockImplementation(async () => {
      updaterMock.progressListener?.({ progress: 50, bytesDownloaded: 500, totalBytes: 1000 });
      return {
        path: '/data/user/0/com.selah.bible/cache/updates/Selah-v1.3.0-3-release.apk',
        cached: false,
        versionCode: 3,
        versionName: '1.3.0',
        sha256: 'c'.repeat(64),
      };
    });

    render(
      <AppUpdaterProvider ready>
        <UpdateBanner />
        <TestUpdaterControls />
      </AppUpdaterProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('ver').textContent).toBe('1.2.0:2');
    });

    fireEvent.click(screen.getByRole('button', { name: /Check updates/i }));

    expect(
      await screen.findByText(/Selah v1\.3\.0 is ready to install/i)
    ).toBeInTheDocument();
    expect(updaterMock.downloadAndVerifyApk).toHaveBeenCalledWith({
      url: 'https://github.com/Inchbrayock/Selah/releases/download/v1.3.0/Selah-v1.3.0-3-release.apk',
      expectedSha256: 'c'.repeat(64),
      minVersionCode: 3,
      fileName: 'Selah-v1.3.0-3-release.apk',
    });

    fireEvent.click(screen.getByRole('button', { name: /Install update/i }));
    await waitFor(() => {
      expect(updaterMock.installDownloadedApk).toHaveBeenCalledWith({
        path: '/data/user/0/com.selah.bible/cache/updates/Selah-v1.3.0-3-release.apk',
      });
    });

    // Persisting automatic updates toggle in localStorage
    const toggle = screen.getByLabelText(/Automatic updates/i) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(false);
    expect(window.localStorage.getItem('selah_auto_update_enabled')).toBe('false');
  });

  it('detects newer web PWA versions via /version.json and offers one-tap refresh', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ version: '1.9.0' }),
      }))
    );

    render(
      <AppUpdaterProvider ready>
        <UpdateBanner />
        <TestUpdaterControls />
      </AppUpdaterProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Check updates/i }));

    expect(await screen.findByText(/Selah v1\.9\.0 is ready/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh now/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Dismiss update notification/i }));
    await waitFor(() => {
      expect(screen.queryByText(/Selah v1\.9\.0 is ready/i)).not.toBeInTheDocument();
    });
    expect(window.localStorage.getItem('selah_dismissed_update_version')).toBe('1.9.0');
  });

  it('triggers automatic Android download and installer prompt when permission is granted', async () => {
    updaterMock.isNative = true;
    updaterMock.platform = 'android';
    updaterMock.pluginAvailable = true;
    updaterMock.canRequestPackageInstalls.mockResolvedValue({ granted: true });
    updaterMock.fetchReleaseManifest.mockResolvedValue({
      status: 200,
      url: 'https://github.com/Inchbrayock/Selah/releases/latest/download/update.json',
      body: JSON.stringify({
        version: '1.3.0',
        versionCode: 3,
        apkName: 'Selah-v1.3.0-3-release.apk',
        apkUrl:
          'https://github.com/Inchbrayock/Selah/releases/download/v1.3.0/Selah-v1.3.0-3-release.apk',
      }),
    });
    updaterMock.downloadAndVerifyApk.mockResolvedValue({
      path: '/data/user/0/com.selah.bible/cache/updates/Selah-v1.3.0-3-release.apk',
      cached: false,
      versionCode: 3,
      versionName: '1.3.0',
      sha256: 'd'.repeat(64),
    });

    const AutoCheckTrigger: React.FC = () => {
      const { currentVersion, currentBuild, autoUpdateEnabled, checkForUpdates } = useAppUpdater();
      return (
        <div>
          <span data-testid="auto-info">
            {`${currentVersion}:${currentBuild}:${autoUpdateEnabled}`}
          </span>
          <button type="button" onClick={() => void checkForUpdates({ manual: false })}>
            Auto check
          </button>
        </div>
      );
    };

    render(
      <AppUpdaterProvider ready>
        <UpdateBanner />
        <AutoCheckTrigger />
      </AppUpdaterProvider>
    );

    await waitFor(() => {
      expect(updaterMock.appGetInfo).toHaveBeenCalled();
      expect(screen.getByTestId('auto-info').textContent).toBe('1.2.0:2:true');
    });

    fireEvent.click(screen.getByRole('button', { name: /Auto check/i }));

    await waitFor(() => {
      expect(updaterMock.fetchReleaseManifest).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(updaterMock.downloadAndVerifyApk).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(updaterMock.canRequestPackageInstalls).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(updaterMock.installDownloadedApk).toHaveBeenCalledWith({
        path: '/data/user/0/com.selah.bible/cache/updates/Selah-v1.3.0-3-release.apk',
      });
    });
  });
});
