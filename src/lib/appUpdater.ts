import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { getNativePlatform, isNativePlatform } from './nativeShell';

export const GITHUB_OWNER = 'Inchbrayock';
export const GITHUB_REPO = 'Selah';

export const RELEASE_MANIFEST_URLS = [
  `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest/download/update.json`,
  `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
] as const;

const AUTO_UPDATE_STORAGE_KEY = 'selah_auto_update_enabled';
const DISMISSED_VERSION_STORAGE_KEY = 'selah_dismissed_update_version';
const WEB_RELOAD_GUARD_KEY = 'selah_sw_reloaded_version';

export interface RemoteReleaseInfo {
  version: string;
  versionCode?: number;
  apkUrl: string;
  apkName: string;
  sha256?: string;
  releaseUrl?: string;
}

export interface DownloadProgressEvent {
  progress: number;
  bytesDownloaded: number;
  totalBytes: number;
}

export interface SelahUpdaterPluginInterface {
  fetchReleaseManifest(options: {
    urls: readonly string[];
  }): Promise<{ status: number; url: string; body: string }>;
  canRequestPackageInstalls(): Promise<{ granted: boolean }>;
  downloadAndVerifyApk(options: {
    url: string;
    expectedSha256?: string;
    minVersionCode?: number;
    fileName?: string;
  }): Promise<{
    path: string;
    cached: boolean;
    versionCode: number;
    versionName: string;
    sha256: string;
  }>;
  installDownloadedApk(options: {
    path: string;
  }): Promise<{ started: boolean; needsPermission: boolean }>;
  clearObsoleteUpdates(): Promise<{ deletedCount: number }>;
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (event: DownloadProgressEvent) => void
  ): Promise<PluginListenerHandle>;
}

const SelahUpdater = registerPlugin<SelahUpdaterPluginInterface>('SelahUpdater');

export function getSelahUpdaterPlugin(): SelahUpdaterPluginInterface {
  return SelahUpdater;
}

export function getBundledAppVersion(): string {
  return typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ ? __APP_VERSION__ : '1.2.0';
}

export function isAndroidNativeApp(): boolean {
  return isNativePlatform() && getNativePlatform() === 'android';
}

export function getAutoUpdateEnabled(): boolean {
  try {
    const raw = window.localStorage.getItem(AUTO_UPDATE_STORAGE_KEY);
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

export function setAutoUpdateEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(AUTO_UPDATE_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore storage unavailability in private/restricted contexts
  }
}

export function getDismissedUpdateVersion(): string | null {
  try {
    const raw = window.localStorage.getItem(DISMISSED_VERSION_STORAGE_KEY);
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

export function setDismissedUpdateVersion(version: string | null): void {
  try {
    if (!version) {
      window.localStorage.removeItem(DISMISSED_VERSION_STORAGE_KEY);
    } else {
      window.localStorage.setItem(DISMISSED_VERSION_STORAGE_KEY, normalizeVersion(version));
    }
  } catch {
    // Ignore storage unavailability
  }
}

export function normalizeVersion(raw: string): string {
  return raw.trim().replace(/^v/i, '');
}

interface ParsedSemver {
  parts: [number, number, number];
  prerelease: string;
}

function parseSemver(raw: string): ParsedSemver | null {
  const cleaned = normalizeVersion(raw);
  const match = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?/.exec(cleaned);
  if (!match) return null;
  return {
    parts: [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)],
    prerelease: match[4] ?? '',
  };
}

/** Returns > 0 if `a > b`, < 0 if `a < b`, and 0 when equal. */
export function compareVersions(a: string, b: string): number {
  const parsedA = parseSemver(a);
  const parsedB = parseSemver(b);
  if (!parsedA || !parsedB) {
    return normalizeVersion(a).localeCompare(normalizeVersion(b));
  }

  for (let i = 0; i < 3; i += 1) {
    if (parsedA.parts[i] !== parsedB.parts[i]) {
      return parsedA.parts[i] - parsedB.parts[i];
    }
  }

  if (parsedA.prerelease === parsedB.prerelease) return 0;
  if (!parsedA.prerelease) return 1;
  if (!parsedB.prerelease) return -1;
  return parsedA.prerelease.localeCompare(parsedB.prerelease);
}

export function isRemoteReleaseNewer(
  currentVersion: string,
  currentBuild: number | null,
  remote: Pick<RemoteReleaseInfo, 'version' | 'versionCode'>
): boolean {
  const semverDiff = compareVersions(remote.version, currentVersion);
  if (semverDiff > 0) return true;
  if (semverDiff < 0) return false;
  if (
    typeof currentBuild === 'number' &&
    currentBuild > 0 &&
    typeof remote.versionCode === 'number' &&
    remote.versionCode > currentBuild
  ) {
    return true;
  }
  return false;
}

export function isTrustedGitHubApkUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (host === 'github.com') {
      return parsed.pathname
        .toLowerCase()
        .startsWith(`/${GITHUB_OWNER.toLowerCase()}/${GITHUB_REPO.toLowerCase()}/`);
    }
    return host === 'githubusercontent.com' || host.endsWith('.githubusercontent.com');
  } catch {
    return false;
  }
}

function extractVersionCodeFromApkName(apkName: string): number | undefined {
  const match = /-(\d+)-(?:release|debug)\.apk$/i.exec(apkName);
  if (!match) return undefined;
  const parsed = Number(match[1]);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeSha256Digest(raw?: string): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const cleaned = raw.trim().replace(/^sha256:/i, '');
  return /^[0-9a-f]{64}$/i.test(cleaned) ? cleaned.toLowerCase() : undefined;
}

export function parseReleasePayload(rawBody: string): RemoteReleaseInfo | null {
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return null;
  }

  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;

  // 1. Direct update.json manifest published with GitHub Release assets
  if (typeof record.version === 'string' && typeof record.apkUrl === 'string') {
    const version = normalizeVersion(record.version);
    if (!version || !isTrustedGitHubApkUrl(record.apkUrl)) return null;
    const apkName =
      typeof record.apkName === 'string' && record.apkName.trim()
        ? record.apkName.trim()
        : record.apkUrl.split('/').pop() || `Selah-v${version}.apk`;
    const versionCode =
      typeof record.versionCode === 'number' &&
      Number.isSafeInteger(record.versionCode) &&
      record.versionCode > 0
        ? record.versionCode
        : extractVersionCodeFromApkName(apkName);
    return {
      version,
      versionCode,
      apkUrl: record.apkUrl,
      apkName,
      sha256: normalizeSha256Digest(typeof record.sha256 === 'string' ? record.sha256 : undefined),
      releaseUrl: typeof record.releaseUrl === 'string' ? record.releaseUrl : undefined,
    };
  }

  // 2. GitHub REST API /releases/latest response fallback
  if (typeof record.tag_name === 'string' && Array.isArray(record.assets)) {
    if (record.draft === true || record.prerelease === true) return null;
    const version = normalizeVersion(record.tag_name);
    if (!version) return null;

    const apkAssets = record.assets.filter((asset): asset is Record<string, unknown> => {
      if (!asset || typeof asset !== 'object') return false;
      const item = asset as Record<string, unknown>;
      return (
        typeof item.name === 'string' &&
        item.name.toLowerCase().endsWith('.apk') &&
        typeof item.browser_download_url === 'string' &&
        isTrustedGitHubApkUrl(item.browser_download_url)
      );
    });

    const preferred =
      apkAssets.find((item) => /-release\.apk$/i.test(String(item.name))) ??
      apkAssets.find((item) => !/-debug\.apk$/i.test(String(item.name))) ??
      apkAssets[0];

    if (!preferred) return null;

    const apkName = String(preferred.name);
    return {
      version,
      versionCode: extractVersionCodeFromApkName(apkName),
      apkUrl: String(preferred.browser_download_url),
      apkName,
      sha256: normalizeSha256Digest(
        typeof preferred.digest === 'string' ? preferred.digest : undefined
      ),
      releaseUrl: typeof record.html_url === 'string' ? record.html_url : undefined,
    };
  }

  return null;
}

export async function getInstalledAppInfo(): Promise<{ version: string; build: number | null }> {
  const fallbackVersion = getBundledAppVersion();
  if (!isNativePlatform()) {
    return { version: fallbackVersion, build: null };
  }
  try {
    const { App } = await import('@capacitor/app');
    const info = await App.getInfo();
    const parsedBuild = Number(info.build);
    return {
      version: normalizeVersion(info.version || fallbackVersion) || fallbackVersion,
      build: Number.isFinite(parsedBuild) && parsedBuild > 0 ? parsedBuild : null,
    };
  } catch {
    return { version: fallbackVersion, build: null };
  }
}

export async function fetchLatestAndroidRelease(): Promise<RemoteReleaseInfo | null> {
  if (!isAndroidNativeApp() || !Capacitor.isPluginAvailable('SelahUpdater')) {
    return null;
  }
  const response = await SelahUpdater.fetchReleaseManifest({
    urls: RELEASE_MANIFEST_URLS,
  });
  return parseReleasePayload(response.body);
}

export async function checkWebVersionUpdate(): Promise<string | null> {
  if (typeof window === 'undefined' || typeof fetch !== 'function') {
    return null;
  }
  const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { version?: unknown };
  if (typeof data?.version !== 'string') return null;
  return normalizeVersion(data.version) || null;
}

export function canSafelyAutoApplyUpdate(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.visibilityState === 'hidden') return false;
  if (document.querySelector('[role="dialog"]')) return false;
  const active = document.activeElement;
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    active instanceof HTMLSelectElement ||
    (active instanceof HTMLElement && active.isContentEditable)
  ) {
    return false;
  }
  return true;
}

export function hasAutoReloadedForVersion(versionKey: string): boolean {
  try {
    return window.sessionStorage.getItem(WEB_RELOAD_GUARD_KEY) === versionKey;
  } catch {
    return false;
  }
}

export function markAutoReloadedForVersion(versionKey: string): void {
  try {
    window.sessionStorage.setItem(WEB_RELOAD_GUARD_KEY, versionKey);
  } catch {
    // Ignore storage unavailability
  }
}
