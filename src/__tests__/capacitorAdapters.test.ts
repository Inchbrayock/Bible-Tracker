import { beforeEach, describe, expect, it, vi } from 'vitest';

const nativeMock = vi.hoisted(() => ({
  isNative: false,
  writeFile: vi.fn(async () => ({ uri: 'file:///cache/selah-sanctuary-backup.json' })),
  share: vi.fn(async () => ({ activityType: 'test' })),
  capGoogleSignIn: vi.fn(async () => ({
    user: null,
    credential: {
      providerId: 'google.com',
      idToken: 'google-id-token',
      accessToken: 'google-access-token',
    },
    additionalUserInfo: null,
  })),
  capSignOut: vi.fn(async () => {}),
  signInWithPopup: vi.fn(),
  signInWithCredential: vi.fn(),
  updateProfile: vi.fn(async () => {}),
  signOut: vi.fn(async () => {}),
  googleCredential: vi.fn((idToken?: string | null, accessToken?: string | null) => ({
    providerId: 'google.com',
    idToken,
    accessToken,
  })),
  fakeServices: {
    app: {},
    auth: { currentUser: null },
    db: {},
    googleProvider: { providerId: 'google.com' },
  },
}));

vi.mock('../lib/nativeShell', () => ({
  isNativePlatform: () => nativeMock.isNative,
  getNativePlatform: () => (nativeMock.isNative ? 'android' : 'web'),
  syncNativeStatusBar: vi.fn(async () => {}),
  hideNativeSplashScreen: vi.fn(async () => {}),
  triggerNativeHaptic: vi.fn(async () => {}),
  subscribeNativeBackButton: vi.fn(() => () => {}),
}));

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: { writeFile: nativeMock.writeFile },
}));

vi.mock('@capacitor/share', () => ({
  Share: { share: nativeMock.share },
}));

vi.mock('@capacitor-firebase/authentication', () => ({
  FirebaseAuthentication: {
    signInWithGoogle: nativeMock.capGoogleSignIn,
    signOut: nativeMock.capSignOut,
  },
}));

vi.mock('../lib/firebase', () => ({
  isFirebaseConfigured: () => true,
  getFirebaseServices: () => nativeMock.fakeServices,
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: { credential: nativeMock.googleCredential },
  createUserWithEmailAndPassword: vi.fn(),
  onAuthStateChanged: vi.fn(() => () => {}),
  sendPasswordResetEmail: vi.fn(),
  signInWithCredential: nativeMock.signInWithCredential,
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: nativeMock.signInWithPopup,
  signOut: nativeMock.signOut,
  updateProfile: nativeMock.updateProfile,
}));

import {
  formatAuthError,
  signInWithGoogleAccount,
  signOutAccount,
} from '../lib/auth';
import { exportSanctuaryBackupFile } from '../lib/backupFile';

describe('Capacitor native adapters', () => {
  beforeEach(() => {
    nativeMock.isNative = false;
    vi.clearAllMocks();
  });

  it('uses Blob anchor download for backup export on web', async () => {
    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    const click = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return { href: '', download: '', click } as unknown as HTMLAnchorElement;
      }
      return origCreateElement(tag);
    });

    const result = await exportSanctuaryBackupFile('{"version":1}');
    expect(result.method).toBe('download');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(nativeMock.writeFile).not.toHaveBeenCalled();

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses Filesystem + Share sheet for backup export on Capacitor native', async () => {
    nativeMock.isNative = true;
    const result = await exportSanctuaryBackupFile('{"version":1}');

    expect(result.method).toBe('share');
    expect(nativeMock.writeFile).toHaveBeenCalledWith({
      path: 'selah-sanctuary-backup.json',
      data: '{"version":1}',
      directory: 'CACHE',
      encoding: 'utf8',
    });
    expect(nativeMock.share).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'file:///cache/selah-sanctuary-backup.json',
      })
    );
  });

  it('uses native Google Sign-In credential handoff on Capacitor and popup on web', async () => {
    nativeMock.signInWithCredential.mockResolvedValue({
      user: {
        uid: 'native-google-1',
        email: 'reader@gmail.com',
        displayName: 'Native Reader',
        photoURL: null,
        emailVerified: true,
        providerData: [{ providerId: 'google.com' }],
      },
    });
    nativeMock.signInWithPopup.mockResolvedValue({
      user: {
        uid: 'web-google-1',
        email: 'web@gmail.com',
        displayName: 'Web Reader',
        photoURL: null,
        emailVerified: true,
        providerData: [{ providerId: 'google.com' }],
      },
    });

    nativeMock.isNative = true;
    const nativeUser = await signInWithGoogleAccount();
    expect(nativeMock.capGoogleSignIn).toHaveBeenCalledWith({ skipNativeAuth: true });
    expect(nativeMock.googleCredential).toHaveBeenCalledWith(
      'google-id-token',
      'google-access-token'
    );
    expect(nativeUser.uid).toBe('native-google-1');

    nativeMock.isNative = false;
    const webUser = await signInWithGoogleAccount();
    expect(nativeMock.signInWithPopup).toHaveBeenCalledTimes(1);
    expect(webUser.uid).toBe('web-google-1');
  });

  it('clears native auth session on signOut and formats native cancellations cleanly', async () => {
    nativeMock.isNative = true;
    await signOutAccount();
    expect(nativeMock.signOut).toHaveBeenCalledTimes(1);
    expect(nativeMock.capSignOut).toHaveBeenCalledTimes(1);

    expect(formatAuthError({ code: '1001' })).toBe('Sign-in window was closed before completing.');
    expect(formatAuthError(new Error('User cancelled the credential flow'))).toBe(
      'Sign-in window was closed before completing.'
    );
  });
});
