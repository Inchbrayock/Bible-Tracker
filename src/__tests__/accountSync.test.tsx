import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountUser } from '../lib/auth';
import type { ColorSchemePreference, ReadingLogEntry, UserPreferences } from '../types/bible';
import { DEFAULT_PREFERENCES } from '../db/repository';

type AuthListener = (user: AccountUser | null) => void;
type UserDocHandler = (
  state: {
    preferences: UserPreferences;
    colorScheme: ColorSchemePreference;
    displayName: string;
  },
  fromCache: boolean
) => void;
type LogsHandler = (logs: ReadingLogEntry[], fromCache: boolean) => void;

const mockState = vi.hoisted(() => {
  const authListeners = new Set<AuthListener>();
  const userDocs = new Map<
    string,
    { displayName: string; preferences: UserPreferences; colorScheme: ColorSchemePreference }
  >();
  const cloudLogsByUid = new Map<string, Map<string, ReadingLogEntry>>();
  const cloudSubscribers = new Map<
    string,
    Set<{ onUserDoc: UserDocHandler; onLogs: LogsHandler }>
  >();

  let currentUser: AccountUser | null = null;

  const notifyUser = (uid: string) => {
    const subs = cloudSubscribers.get(uid);
    if (!subs) return;
    const uDoc = userDocs.get(uid);
    const logs = [...(cloudLogsByUid.get(uid)?.values() ?? [])];
    for (const sub of subs) {
      if (uDoc) sub.onUserDoc(uDoc, false);
      sub.onLogs(logs, false);
    }
  };

  return {
    authListeners,
    userDocs,
    cloudLogsByUid,
    cloudSubscribers,
    getCurrentUser: () => currentUser,
    setCurrentUser: (user: AccountUser | null) => {
      currentUser = user;
      for (const listener of authListeners) {
        listener(user);
      }
    },
    notifyUser,
    reset: () => {
      currentUser = null;
      authListeners.clear();
      userDocs.clear();
      cloudLogsByUid.clear();
      cloudSubscribers.clear();
    },
  };
});

vi.mock('../lib/auth', () => ({
  isAuthAvailable: () => true,
  subscribeToAuthState: (cb: AuthListener) => {
    mockState.authListeners.add(cb);
    cb(mockState.getCurrentUser());
    return () => {
      mockState.authListeners.delete(cb);
    };
  },
  signInWithGoogleAccount: vi.fn(async () => {
    const user: AccountUser = {
      uid: 'google-uid-1',
      email: 'reader@gmail.com',
      displayName: 'Grace Reader',
      photoURL: null,
      emailVerified: true,
      providerIds: ['google.com'],
    };
    mockState.setCurrentUser(user);
    return user;
  }),
  signInWithEmailAccount: vi.fn(async (email: string) => {
    const user: AccountUser = {
      uid: 'email-uid-1',
      email: email.trim(),
      displayName: 'Hannah',
      photoURL: null,
      emailVerified: false,
      providerIds: ['password'],
    };
    mockState.setCurrentUser(user);
    return user;
  }),
  signUpWithEmailAccount: vi.fn(
    async (email: string, _password: string, displayName?: string) => {
      const user: AccountUser = {
        uid: 'signup-uid-1',
        email: email.trim(),
        displayName: displayName?.trim() || null,
        photoURL: null,
        emailVerified: false,
        providerIds: ['password'],
      };
      mockState.setCurrentUser(user);
      return user;
    }
  ),
  updateAccountDisplayName: vi.fn(async (displayName: string) => {
    const current = mockState.getCurrentUser();
    if (!current) throw new Error('Not signed in');
    const updated = { ...current, displayName: displayName.trim() || null };
    return updated;
  }),
  sendAccountPasswordReset: vi.fn(async () => {}),
  signOutAccount: vi.fn(async () => {
    mockState.setCurrentUser(null);
  }),
  formatAuthError: (err: unknown) =>
    err instanceof Error ? err.message : 'Authentication failed.',
}));

const cloudSpies = vi.hoisted(() => ({
  upsertCloudReadingLog: vi.fn(),
  deleteCloudReadingLog: vi.fn(),
  batchSyncReadingLogs: vi.fn(),
  saveCloudPreferences: vi.fn(),
  saveCloudColorScheme: vi.fn(),
  saveCloudDisplayName: vi.fn(),
}));

vi.mock('../db/cloudSync', () => ({
  ensureCloudUserDoc: vi.fn(
    async (
      user: AccountUser,
      defaults: { preferences: UserPreferences; colorScheme: ColorSchemePreference }
    ) => {
      const existing = mockState.userDocs.get(user.uid);
      if (existing) {
        return { existed: true, ...existing };
      }
      const created = {
        displayName: user.displayName ?? '',
        preferences: defaults.preferences,
        colorScheme: defaults.colorScheme,
      };
      mockState.userDocs.set(user.uid, created);
      return { existed: false, ...created };
    }
  ),
  fetchCloudLogs: vi.fn(async (uid: string) => {
    return [...(mockState.cloudLogsByUid.get(uid)?.values() ?? [])];
  }),
  subscribeCloudSanctuary: vi.fn(
    (
      uid: string,
      handlers: { onUserDoc: UserDocHandler; onLogs: LogsHandler; onError: (err: Error) => void }
    ) => {
      const set = mockState.cloudSubscribers.get(uid) ?? new Set();
      set.add(handlers);
      mockState.cloudSubscribers.set(uid, set);
      return () => {
        set.delete(handlers);
      };
    }
  ),
  saveCloudPreferences: cloudSpies.saveCloudPreferences.mockImplementation(
    async (uid: string, preferences: UserPreferences) => {
      const current = mockState.userDocs.get(uid);
      if (current) {
        mockState.userDocs.set(uid, { ...current, preferences });
        mockState.notifyUser(uid);
      }
    }
  ),
  saveCloudColorScheme: cloudSpies.saveCloudColorScheme.mockImplementation(
    async (uid: string, colorScheme: ColorSchemePreference) => {
      const current = mockState.userDocs.get(uid);
      if (current) {
        mockState.userDocs.set(uid, { ...current, colorScheme });
        mockState.notifyUser(uid);
      }
    }
  ),
  saveCloudDisplayName: cloudSpies.saveCloudDisplayName.mockImplementation(
    async (uid: string, displayName: string) => {
      const current = mockState.userDocs.get(uid);
      if (current) {
        mockState.userDocs.set(uid, { ...current, displayName });
        mockState.notifyUser(uid);
      }
    }
  ),
  upsertCloudReadingLog: cloudSpies.upsertCloudReadingLog.mockImplementation(
    async (uid: string, entry: ReadingLogEntry) => {
      const map = mockState.cloudLogsByUid.get(uid) ?? new Map<string, ReadingLogEntry>();
      map.set(entry.id, entry);
      mockState.cloudLogsByUid.set(uid, map);
      mockState.notifyUser(uid);
    }
  ),
  deleteCloudReadingLog: cloudSpies.deleteCloudReadingLog.mockImplementation(
    async (uid: string, logId: string) => {
      const map = mockState.cloudLogsByUid.get(uid);
      map?.delete(logId);
      mockState.notifyUser(uid);
    }
  ),
  batchSyncReadingLogs: cloudSpies.batchSyncReadingLogs.mockImplementation(
    async (uid: string, upserts: ReadingLogEntry[], deleteIds: string[]) => {
      const map = mockState.cloudLogsByUid.get(uid) ?? new Map<string, ReadingLogEntry>();
      for (const id of deleteIds) map.delete(id);
      for (const entry of upserts) map.set(entry.id, entry);
      mockState.cloudLogsByUid.set(uid, map);
      mockState.notifyUser(uid);
    }
  ),
  replaceCloudLogs: vi.fn(async (uid: string, nextLogs: ReadingLogEntry[]) => {
    const map = new Map<string, ReadingLogEntry>();
    for (const entry of nextLogs) map.set(entry.id, entry);
    mockState.cloudLogsByUid.set(uid, map);
    mockState.notifyUser(uid);
  }),
}));

import { App } from '../App';
import { signInWithGoogleAccount } from '../lib/auth';

describe('Firebase Account & Cloud Sync', () => {
  beforeEach(() => {
    localStorage.clear();
    mockState.reset();
    vi.clearAllMocks();
  });

  it('opens account dialog, creates an account with email/password, and signs out cleanly', async () => {
    render(<App />);
    expect(await screen.findByText(/Canonical Journey/i)).toBeInTheDocument();

    const signInHeaderBtn = screen.getByRole('button', {
      name: /Sign in to sync your Sanctuary account/i,
    });
    fireEvent.click(signInHeaderBtn);

    expect(await screen.findByText(/Save Your Reading Ledger/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Create account/i }));

    fireEvent.change(screen.getByLabelText(/Display name/i), {
      target: { value: 'David' },
    });
    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: 'david@selah.app' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'secret123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Create Sanctuary account/i }));

    expect(await screen.findByText(/Your Sanctuary Account/i)).toBeInTheDocument();
    expect(screen.getByText('david@selah.app')).toBeInTheDocument();
    expect(screen.getByText(/Synced to cloud/i)).toBeInTheDocument();

    // Update display name
    fireEvent.click(screen.getByRole('button', { name: /Edit display name/i }));
    const editNameInput = screen.getByLabelText(/^Display name$/i);
    fireEvent.change(editNameInput, { target: { value: 'King David' } });
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      expect(cloudSpies.saveCloudDisplayName).toHaveBeenCalledWith('signup-uid-1', 'King David');
    });

    // Sign out clears cached account
    fireEvent.click(screen.getByRole('button', { name: /Sign out/i }));
    await waitFor(() => {
      expect(screen.getByText(/Save Your Reading Ledger/i)).toBeInTheDocument();
    });
  }, 15000);

  it('automatically uploads local guest readings when signing into an empty cloud account', async () => {
    render(<App />);
    expect(await screen.findByText(/Canonical Journey/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Quick Log: John 1/i }));
    await waitFor(() => {
      expect(screen.getByText(/1 \/ 1,189 chapters/i)).toBeInTheDocument();
    });

    // Sign in with Google
    fireEvent.click(
      screen.getByRole('button', { name: /Sign in to sync your Sanctuary account/i })
    );
    fireEvent.click(await screen.findByRole('button', { name: /Continue with Google/i }));

    await waitFor(() => {
      expect(cloudSpies.batchSyncReadingLogs).toHaveBeenCalled();
    });

    const syncedMap = mockState.cloudLogsByUid.get('google-uid-1');
    expect(syncedMap?.size).toBe(1);
    const savedEntry = [...(syncedMap?.values() ?? [])][0];
    expect(savedEntry.bookId).toBe('john');
    expect(savedEntry.chapters).toEqual([1]);

    // Logging another chapter while signed in pushes to cloud
    fireEvent.click(screen.getByRole('button', { name: /Close account dialog/i }));
    fireEvent.click(screen.getByRole('button', { name: /Quick Log: John 2/i }));

    await waitFor(() => {
      expect(cloudSpies.upsertCloudReadingLog).toHaveBeenCalled();
      expect(screen.getByText(/2 \/ 1,189 chapters/i)).toBeInTheDocument();
    });

    // Signing out resets local ledger so cached data isn't left behind
    fireEvent.click(screen.getByRole('button', { name: /Open account and cloud sync/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Sign out/i }));

    await waitFor(() => {
      expect(screen.getByText(/0 \/ 1,189 chapters/i)).toBeInTheDocument();
    });
  }, 15000);

  it('prompts to merge local readings when signing into an existing cloud ledger', async () => {
    // Seed existing cloud account for email-uid-1
    mockState.userDocs.set('email-uid-1', {
      displayName: 'Hannah',
      preferences: { ...DEFAULT_PREFERENCES },
      colorScheme: 'system',
    });
    const existingLogs = new Map<string, ReadingLogEntry>();
    existingLogs.set('cloud-gen-1', {
      id: 'cloud-gen-1',
      bookId: 'genesis',
      chapters: [1],
      readDate: '2026-11-10',
      loggedAt: '2026-11-10T08:00:00.000Z',
    });
    mockState.cloudLogsByUid.set('email-uid-1', existingLogs);

    render(<App />);
    expect(await screen.findByText(/Canonical Journey/i)).toBeInTheDocument();

    // Log a local guest chapter
    fireEvent.click(screen.getByRole('button', { name: /Quick Log: John 1/i }));
    await waitFor(() => {
      expect(screen.getByText(/1 \/ 1,189 chapters/i)).toBeInTheDocument();
    });

    // Sign into email-uid-1
    await act(async () => {
      mockState.setCurrentUser({
        uid: 'email-uid-1',
        email: 'hannah@selah.app',
        displayName: 'Hannah',
        photoURL: null,
        emailVerified: true,
        providerIds: ['password'],
      });
    });

    expect(
      await screen.findByText(/Unmerged local readings found on this device/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Merge into my account/i }));

    await waitFor(() => {
      expect(screen.getByText(/2 \/ 1,189 chapters/i)).toBeInTheDocument();
      expect(
        screen.queryByText(/Unmerged local readings found on this device/i)
      ).not.toBeInTheDocument();
    });
    expect(mockState.cloudLogsByUid.get('email-uid-1')?.size).toBe(2);
  }, 15000);

  it('supports Keep cloud only merge strategy and syncs preferences and color scheme', async () => {
    mockState.userDocs.set('email-uid-1', {
      displayName: 'Hannah',
      preferences: { ...DEFAULT_PREFERENCES },
      colorScheme: 'system',
    });
    const existingLogs = new Map<string, ReadingLogEntry>();
    existingLogs.set('cloud-gen-1', {
      id: 'cloud-gen-1',
      bookId: 'genesis',
      chapters: [1],
      readDate: '2026-11-10',
      loggedAt: '2026-11-10T08:00:00.000Z',
    });
    mockState.cloudLogsByUid.set('email-uid-1', existingLogs);

    render(<App />);
    expect(await screen.findByText(/Canonical Journey/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Quick Log: John 1/i }));
    await waitFor(() => {
      expect(screen.getByText(/1 \/ 1,189 chapters/i)).toBeInTheDocument();
    });

    await act(async () => {
      mockState.setCurrentUser({
        uid: 'email-uid-1',
        email: 'hannah@selah.app',
        displayName: 'Hannah',
        photoURL: null,
        emailVerified: true,
        providerIds: ['password'],
      });
    });

    expect(
      await screen.findByText(/Unmerged local readings found on this device/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Keep cloud only/i }));

    await waitFor(() => {
      expect(
        screen.queryByText(/Unmerged local readings found on this device/i)
      ).not.toBeInTheDocument();
      expect(screen.getByText(/1 \/ 1,189 chapters/i)).toBeInTheDocument();
    });
    expect(mockState.cloudLogsByUid.get('email-uid-1')?.size).toBe(1);

    // Open Settings and toggle color scheme + preference -> syncs to cloud
    fireEvent.click(screen.getByRole('button', { name: /Open settings/i }));
    expect(await screen.findByText(/Sanctuary Settings/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Vesper Candlelight/i }));
    fireEvent.click(screen.getByLabelText(/Sabbath grace day/i));

    await waitFor(() => {
      expect(cloudSpies.saveCloudColorScheme).toHaveBeenCalledWith('email-uid-1', 'dark');
      expect(cloudSpies.saveCloudPreferences).toHaveBeenCalledWith(
        'email-uid-1',
        expect.objectContaining({ streakGraceEnabled: false })
      );
    });
  }, 15000);

  it('displays friendly auth errors and supports password reset flow', async () => {
    vi.mocked(signInWithGoogleAccount).mockRejectedValueOnce(
      new Error('Pop-up was blocked by your browser.')
    );

    render(<App />);
    expect(await screen.findByText(/Canonical Journey/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /Sign in to sync your Sanctuary account/i })
    );
    fireEvent.click(await screen.findByRole('button', { name: /Continue with Google/i }));

    expect(
      await screen.findByText(/Pop-up was blocked by your browser\./i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Forgot password\?/i }));
    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: 'hannah@selah.app' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send reset link/i }));

    expect(
      await screen.findByText(/Password reset link sent\. Check your inbox\./i)
    ).toBeInTheDocument();
  }, 15000);
});
