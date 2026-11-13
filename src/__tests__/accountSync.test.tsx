import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountUser } from '../lib/auth';
import type {
  ColorSchemePreference,
  CustomPlanDefinition,
  ReadingLogEntry,
  UserPreferences,
} from '../types/bible';
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
type CustomPlansHandler = (plans: CustomPlanDefinition[], fromCache: boolean) => void;

const mockState = vi.hoisted(() => {
  const authListeners = new Set<AuthListener>();
  const userDocs = new Map<
    string,
    { displayName: string; preferences: UserPreferences; colorScheme: ColorSchemePreference }
  >();
  const cloudLogsByUid = new Map<string, Map<string, ReadingLogEntry>>();
  const cloudCustomPlansByUid = new Map<string, Map<string, CustomPlanDefinition>>();
  const cloudSubscribers = new Map<
    string,
    Set<{
      onUserDoc: UserDocHandler;
      onLogs: LogsHandler;
      onCustomPlans?: CustomPlansHandler;
    }>
  >();

  let currentUser: AccountUser | null = null;

  const notifyUser = (uid: string) => {
    const subs = cloudSubscribers.get(uid);
    if (!subs) return;
    const uDoc = userDocs.get(uid);
    const logs = [...(cloudLogsByUid.get(uid)?.values() ?? [])];
    const customPlans = [...(cloudCustomPlansByUid.get(uid)?.values() ?? [])];
    for (const sub of subs) {
      if (uDoc) sub.onUserDoc(uDoc, false);
      sub.onLogs(logs, false);
      sub.onCustomPlans?.(customPlans, false);
    }
  };

  return {
    authListeners,
    userDocs,
    cloudLogsByUid,
    cloudCustomPlansByUid,
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
      cloudCustomPlansByUid.clear();
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
  upsertCloudCustomPlan: vi.fn(),
  deleteCloudCustomPlan: vi.fn(),
  batchSyncCustomPlans: vi.fn(),
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
  fetchCloudCustomPlans: vi.fn(async (uid: string) => {
    return [...(mockState.cloudCustomPlansByUid.get(uid)?.values() ?? [])];
  }),
  subscribeCloudSanctuary: vi.fn(
    (
      uid: string,
      handlers: {
        onUserDoc: UserDocHandler;
        onLogs: LogsHandler;
        onCustomPlans?: CustomPlansHandler;
        onError: (err: Error) => void;
      }
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
  upsertCloudCustomPlan: cloudSpies.upsertCloudCustomPlan.mockImplementation(
    async (uid: string, plan: CustomPlanDefinition) => {
      const map =
        mockState.cloudCustomPlansByUid.get(uid) ?? new Map<string, CustomPlanDefinition>();
      map.set(plan.id, plan);
      mockState.cloudCustomPlansByUid.set(uid, map);
      mockState.notifyUser(uid);
    }
  ),
  deleteCloudCustomPlan: cloudSpies.deleteCloudCustomPlan.mockImplementation(
    async (uid: string, planId: string) => {
      const map = mockState.cloudCustomPlansByUid.get(uid);
      map?.delete(planId);
      mockState.notifyUser(uid);
    }
  ),
  batchSyncCustomPlans: cloudSpies.batchSyncCustomPlans.mockImplementation(
    async (uid: string, upserts: CustomPlanDefinition[], deleteIds: string[]) => {
      const map =
        mockState.cloudCustomPlansByUid.get(uid) ?? new Map<string, CustomPlanDefinition>();
      for (const id of deleteIds) map.delete(id);
      for (const plan of upserts) map.set(plan.id, plan);
      mockState.cloudCustomPlansByUid.set(uid, map);
      mockState.notifyUser(uid);
    }
  ),
  replaceCloudCustomPlans: vi.fn(
    async (uid: string, nextPlans: CustomPlanDefinition[]) => {
      const map = new Map<string, CustomPlanDefinition>();
      for (const plan of nextPlans) map.set(plan.id, plan);
      mockState.cloudCustomPlansByUid.set(uid, map);
      mockState.notifyUser(uid);
    }
  ),
}));

import { App } from '../App';
import { signInWithGoogleAccount } from '../lib/auth';

function getWholeBibleChapterReadout(chaptersRead: number) {
  return screen.getByText(
    (_, el) => el?.tagName === 'SPAN' && el.textContent?.trim() === `${chaptersRead} / 1,189 ch`
  );
}

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
      expect(getWholeBibleChapterReadout(1)).toBeInTheDocument();
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
      expect(getWholeBibleChapterReadout(2)).toBeInTheDocument();
    });

    // Signing out resets local ledger so cached data isn't left behind
    fireEvent.click(screen.getByRole('button', { name: /Open account and cloud sync/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Sign out/i }));

    await waitFor(() => {
      expect(getWholeBibleChapterReadout(0)).toBeInTheDocument();
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
      expect(getWholeBibleChapterReadout(1)).toBeInTheDocument();
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
      expect(getWholeBibleChapterReadout(2)).toBeInTheDocument();
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
      expect(getWholeBibleChapterReadout(1)).toBeInTheDocument();
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
      expect(getWholeBibleChapterReadout(1)).toBeInTheDocument();
    });
    expect(mockState.cloudLogsByUid.get('email-uid-1')?.size).toBe(1);

    // Open profile popover -> Settings page and toggle color scheme + preference -> syncs to cloud
    fireEvent.click(screen.getByRole('button', { name: /Open account and cloud sync/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Settings/i }));
    expect(
      await screen.findByRole('heading', { level: 1, name: /Sanctuary Settings/i })
    ).toBeInTheDocument();
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

  it('displays profile picture on the far right without a top-bar settings button and opens dedicated Settings from the popover', async () => {
    render(<App />);
    expect(await screen.findByText(/Canonical Journey/i)).toBeInTheDocument();

    // No standalone Settings button exists in the header before clicking the profile button
    expect(screen.queryByRole('button', { name: /Open settings|Settings/i })).not.toBeInTheDocument();
    const signInBtn = screen.getByRole('button', {
      name: /Sign in to sync your Sanctuary account/i,
    });
    expect(signInBtn).toBeInTheDocument();

    // Sign in with a Google profile picture
    await act(async () => {
      mockState.setCurrentUser({
        uid: 'photo-uid-1',
        email: 'grace@selah.app',
        displayName: 'Grace Reader',
        photoURL: 'https://example.com/grace.jpg',
        emailVerified: true,
        providerIds: ['google.com'],
      });
    });

    const accountBtn = await screen.findByRole('button', {
      name: /Open account and cloud sync/i,
    });
    expect(screen.queryByRole('button', { name: /Open settings|Settings/i })).not.toBeInTheDocument();

    // Displays profile picture rather than user name in the header
    const header = document.querySelector('header');
    expect(header).not.toBeNull();
    expect(header?.textContent).not.toContain('Grace');
    const avatarImg = accountBtn.querySelector('img');
    expect(avatarImg).not.toBeNull();
    expect(avatarImg?.getAttribute('src')).toBe('https://example.com/grace.jpg');

    // Falls back to monogram initials (not name text) if profile photo fails to load
    if (avatarImg) {
      fireEvent.error(avatarImg);
    }
    expect(accountBtn.querySelector('img')).toBeNull();
    expect(accountBtn.textContent).toBe('GR');
    expect(header?.textContent).not.toContain('Grace');

    // Navigate from another tab so Back button returns to that previous tab
    fireEvent.click(screen.getByRole('button', { name: /Books & Chapters/i }));
    fireEvent.click(accountBtn);
    expect(await screen.findByTestId('account-popover')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Settings/i }));

    expect(
      await screen.findByRole('heading', { level: 1, name: /Sanctuary Settings/i })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-nav-pill')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByTestId('account-popover')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Back to Books & Chapters/i }));
    expect(await screen.findByRole('heading', { level: 1, name: /Scripture Library/i })).toBeInTheDocument();
  }, 15000);

  it('opens the account screen anchored beneath the profile button and dismisses cleanly', async () => {
    render(<App />);
    expect(await screen.findByText(/Canonical Journey/i)).toBeInTheDocument();

    await act(async () => {
      mockState.setCurrentUser({
        uid: 'popover-uid-1',
        email: 'grace@selah.app',
        displayName: 'Grace Reader',
        photoURL: 'https://example.com/grace.jpg',
        emailVerified: true,
        providerIds: ['google.com'],
      });
    });

    const profileBtn = await screen.findByRole('button', {
      name: /Open account and cloud sync/i,
    });
    vi.spyOn(profileBtn, 'getBoundingClientRect').mockReturnValue({
      top: 12,
      bottom: 48,
      left: 900,
      right: 936,
      width: 36,
      height: 36,
      x: 900,
      y: 12,
      toJSON: () => ({}),
    });

    fireEvent.click(profileBtn);
    const popover = await screen.findByTestId('account-popover');
    expect(popover).toHaveStyle({
      top: '56px',
      right: `${window.innerWidth - 936}px`,
    });
    expect(profileBtn).toHaveAttribute('aria-expanded', 'true');

    // Clicking outside dismisses the anchored popover
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByTestId('account-popover')).not.toBeInTheDocument();
    });

    // Reopen and toggle closed by clicking the profile button again
    fireEvent.click(profileBtn);
    expect(await screen.findByTestId('account-popover')).toBeInTheDocument();
    fireEvent.click(profileBtn);
    await waitFor(() => {
      expect(screen.queryByTestId('account-popover')).not.toBeInTheDocument();
    });

    // Reopen and dismiss with Escape
    fireEvent.click(profileBtn);
    expect(await screen.findByTestId('account-popover')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByTestId('account-popover')).not.toBeInTheDocument();
    });
  }, 15000);

  it('persists deleted default shelf plans in cloud sync without stale snapshot bounce-back', async () => {
    mockState.userDocs.set('email-uid-1', {
      displayName: 'Hannah',
      preferences: { ...DEFAULT_PREFERENCES },
      colorScheme: 'system',
    });

    let resolvePendingWrite!: () => void;
    const defaultImpl = cloudSpies.saveCloudPreferences.getMockImplementation();
    cloudSpies.saveCloudPreferences.mockImplementationOnce(
      async (uid: string, preferences: UserPreferences) => {
        await new Promise<void>((resolve) => {
          resolvePendingWrite = resolve;
        });
        const current = mockState.userDocs.get(uid);
        if (current) {
          mockState.userDocs.set(uid, { ...current, preferences });
          mockState.notifyUser(uid);
        }
      }
    );

    render(<App />);
    expect(await screen.findByText(/Canonical Journey/i)).toBeInTheDocument();

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

    fireEvent.click(screen.getByRole('button', { name: /Journal & Plans/i }));
    expect(await screen.findByText(/Reading Journal/i)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /Reading Plans/i }));

    const selectorGroup = await screen.findByRole('group', { name: /Choose a reading plan/i });
    const card = within(selectorGroup).getByText(/Canonical Bible in 1 Year/i).closest('article')!;
    fireEvent.click(within(card).getByRole('button', { name: /Delete plan from shelf/i }));
    fireEvent.click(within(card).getByRole('button', { name: /Confirm delete/i }));

    await waitFor(() => {
      expect(within(selectorGroup).getAllByRole('article')).toHaveLength(3);
    });

    // While the cloud write is still in flight, a stale snapshot with 4 default plans must not restore the deleted plan
    await act(async () => {
      mockState.notifyUser('email-uid-1');
    });
    expect(within(selectorGroup).getAllByRole('article')).toHaveLength(3);
    expect(within(selectorGroup).queryByText(/Canonical Bible in 1 Year/i)).not.toBeInTheDocument();

    await act(async () => {
      resolvePendingWrite();
    });

    await waitFor(() => {
      expect(mockState.userDocs.get('email-uid-1')?.preferences.shelfPlanIds).toEqual([
        'gospels-acts-45',
        'psalms-proverbs-31',
        'nt-90',
      ]);
    });
    expect(within(selectorGroup).getAllByRole('article')).toHaveLength(3);

    if (defaultImpl) {
      cloudSpies.saveCloudPreferences.mockImplementation(defaultImpl);
    }
  }, 15000);
});
