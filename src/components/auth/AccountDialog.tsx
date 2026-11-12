import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  Cloud,
  CloudOff,
  Edit3,
  LogOut,
  Mail,
  RefreshCw,
  UserCheck,
  X,
} from 'lucide-react';
import { useBibleStore } from '../../store/useBibleStore';
import { ModalDialog } from '../ui/ModalDialog';

interface AccountDialogProps {
  open: boolean;
  onClose: () => void;
}

type AuthMode = 'signin' | 'signup' | 'reset';

const GoogleMark: React.FC = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.09.73-2.49 1.16-4.22 1.16-3.24 0-5.99-2.19-6.97-5.13H1.02v3.14C3.03 21.15 7.21 24 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.03 14.02c-.25-.73-.39-1.51-.39-2.32s.14-1.59.39-2.32V6.24H1.02A11.98 11.98 0 0 0 0 11.7c0 1.94.46 3.77 1.02 5.46l4.01-3.14Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.65c1.8 0 3.41.62 4.68 1.83l3.51-3.51C18.07 1.19 15.3 0 12 0 7.21 0 3.03 2.85 1.02 6.86l4.01 3.14c.98-2.94 3.73-5.35 6.97-5.35Z"
    />
  </svg>
);

const AppleMark: React.FC = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.08ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
  </svg>
);

function getInitials(displayName: string | null, email: string | null): string {
  const source = (displayName || email || 'S').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export const AccountDialog: React.FC<AccountDialogProps> = ({ open, onClose }) => {
  const {
    firebaseAvailable,
    user,
    logs,
    summary,
    achievements,
    syncStatus,
    syncError,
    lastSyncedAt,
    pendingMerge,
    signInWithGoogle,
    signInWithApple,
    signInWithEmail,
    signUpWithEmail,
    updateDisplayName,
    sendPasswordReset,
    signOut,
    resolveGuestMerge,
    syncNow,
  } = useBibleStore();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  useEffect(() => {
    if (open) {
      setErrorMsg(null);
      setStatusMsg(null);
      setEditingName(false);
      setNameDraft(user?.displayName ?? '');
    }
  }, [open, user?.displayName]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const runProviderSignIn = async (
    signInFn: () => Promise<void>,
    fallbackMessage: string
  ) => {
    setErrorMsg(null);
    setStatusMsg(null);
    setSubmitting(true);
    try {
      await signInFn();
      setPassword('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : fallbackMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        setPassword('');
      } else if (mode === 'signup') {
        await signUpWithEmail(email, password, displayName);
        setPassword('');
      } else {
        await sendPasswordReset(email);
        setStatusMsg('Password reset link sent. Check your inbox.');
        setMode('signin');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not complete request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    setSubmitting(true);
    try {
      await updateDisplayName(nameDraft);
      setEditingName(false);
      setStatusMsg('Profile name updated.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not update display name.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    setSubmitting(true);
    try {
      await signOut();
      setMode('signin');
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not sign out.');
    } finally {
      setSubmitting(false);
    }
  };

  const syncBadge = (() => {
    switch (syncStatus) {
      case 'synced':
        return {
          icon: Cloud,
          label: 'Synced to cloud',
          tone: 'text-[var(--color-sage)] bg-[var(--color-sage-soft)]',
        };
      case 'syncing':
        return {
          icon: RefreshCw,
          label: 'Syncing ledger…',
          tone: 'text-[var(--color-accent)] bg-[var(--color-accent-soft)]',
        };
      case 'offline':
        return {
          icon: CloudOff,
          label: 'Offline — saved locally',
          tone: 'text-[var(--color-lamp)] bg-[var(--color-lamp-soft)]',
        };
      case 'error':
        return {
          icon: AlertCircle,
          label: 'Sync issue',
          tone: 'text-[var(--color-crimson)] bg-[var(--bg-surface)]',
        };
      default:
        return {
          icon: Cloud,
          label: 'Local only',
          tone: 'text-[var(--text-secondary)] bg-[var(--bg-surface)]',
        };
    }
  })();

  const SyncIcon = syncBadge.icon;

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      labelledBy="account-dialog-title"
      className="max-w-md"
    >
      <div className="flex max-h-[92dvh] flex-col sm:max-h-[88dvh]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2
              id="account-dialog-title"
              className="font-display text-2xl font-medium text-[var(--text-primary)]"
            >
              {user ? 'Your Sanctuary Account' : 'Save Your Reading Ledger'}
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {user
                ? 'Readings, study notes, plans, and seals stay synced to your account.'
                : 'Sign in or create an account to back up and sync across devices.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account dialog"
            className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] sm:min-h-9 sm:min-w-9"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-4 sm:space-y-5 sm:p-6">
          {!firebaseAvailable ? (
            <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
              <p className="font-medium text-[var(--text-primary)]">
                Firebase accounts unavailable in this environment
              </p>
              <p className="mt-1 text-xs leading-relaxed">
                Configure your Firebase web credentials in <code className="font-mono">.env.local</code>{' '}
                to enable cloud sign-in. Your data continues to save locally in this browser.
              </p>
            </div>
          ) : user ? (
            <>
              {/* Profile Card */}
              <div className="flex items-start gap-3.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-11 w-11 shrink-0 rounded-full border border-[var(--border-subtle)] object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-accent)] bg-[var(--color-accent-soft)] font-display text-base font-medium text-[var(--color-accent)]"
                  >
                    {getInitials(user.displayName, user.email)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  {editingName ? (
                    <form onSubmit={(e) => void handleSaveName(e)} className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        aria-label="Display name"
                        maxLength={100}
                        placeholder="Your name"
                        className="folio-input min-h-10 min-w-0 flex-1 px-2.5 py-1 text-base sm:min-h-0 sm:text-sm"
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="btn-sage min-h-10 rounded px-3 py-1 text-xs font-medium disabled:opacity-60 sm:min-h-0 sm:px-2.5"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingName(false);
                          setNameDraft(user.displayName ?? '');
                        }}
                        className="min-h-10 rounded border border-[var(--border-subtle)] px-3 py-1 text-xs text-[var(--text-secondary)] sm:min-h-0 sm:px-2.5"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-display text-lg font-medium text-[var(--text-primary)]">
                        {user.displayName || 'Selah Reader'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setNameDraft(user.displayName ?? '');
                          setEditingName(true);
                        }}
                        aria-label="Edit display name"
                        className="inline-flex min-h-9 items-center gap-1 rounded px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] sm:min-h-0 sm:px-2"
                      >
                        <Edit3 className="h-3 w-3" aria-hidden="true" />
                        <span>Edit</span>
                      </button>
                    </div>
                  )}

                  {user.email && (
                    <p className="truncate text-xs text-[var(--text-secondary)]">{user.email}</p>
                  )}

                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium ${syncBadge.tone}`}
                    >
                      <SyncIcon
                        className={`h-3.5 w-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}
                        aria-hidden="true"
                      />
                      <span>{syncBadge.label}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded border border-[var(--border-subtle)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                      <UserCheck className="h-3 w-3" aria-hidden="true" />
                      <span>
                        {user.providerIds.includes('google.com') ? 'Google' : 'Email'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Pending Guest Merge */}
              {pendingMerge && (
                <div className="rounded-md border border-[var(--color-accent)] bg-[var(--color-accent-soft)] p-4 text-xs">
                  <p className="font-medium text-[var(--text-primary)]">
                    Unmerged local readings on this device
                  </p>
                  <p className="mt-1 leading-relaxed text-[var(--text-secondary)]">
                    Found {pendingMerge.guestLogs.length} local reading{' '}
                    {pendingMerge.guestLogs.length === 1 ? 'session' : 'sessions'} created before
                    sign-in alongside {pendingMerge.cloudLogsCount} saved in your cloud account.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void resolveGuestMerge('merge')}
                      className="btn-primary rounded-md px-3 py-1.5 font-medium"
                    >
                      Merge local into account
                    </button>
                    <button
                      type="button"
                      onClick={() => void resolveGuestMerge('cloud-only')}
                      className="rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-1.5 font-medium text-[var(--text-primary)]"
                    >
                      Keep cloud only
                    </button>
                  </div>
                </div>
              )}

              {/* Sync Summary */}
              <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4">
                <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] text-center">
                  <div className="px-2">
                    <p className="text-xs text-[var(--text-secondary)]">Sessions</p>
                    <p className="mt-0.5 font-display text-lg font-medium tabular-nums text-[var(--text-primary)]">
                      {logs.length}
                    </p>
                  </div>
                  <div className="px-2">
                    <p className="text-xs text-[var(--text-secondary)]">Chapters</p>
                    <p className="mt-0.5 font-display text-lg font-medium tabular-nums text-[var(--text-primary)]">
                      {summary.totalChaptersRead}
                    </p>
                  </div>
                  <div className="px-2">
                    <p className="text-xs text-[var(--text-secondary)]">Seals</p>
                    <p className="mt-0.5 font-display text-lg font-medium tabular-nums text-[var(--text-primary)]">
                      {unlockedCount}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3 text-xs text-[var(--text-secondary)]">
                  <span className="tabular-nums">
                    {lastSyncedAt
                      ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : 'Cloud backup active'}
                  </span>
                  <button
                    type="button"
                    disabled={syncStatus === 'syncing'}
                    onClick={() => void syncNow()}
                    className="inline-flex items-center gap-1.5 font-medium text-[var(--color-accent)] hover:underline disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                    <span>Sync now</span>
                  </button>
                </div>
              </div>

              {syncError && (
                <p role="alert" className="text-xs font-medium text-[var(--color-crimson)]">
                  {syncError}
                </p>
              )}
              {errorMsg && (
                <p role="alert" className="text-xs font-medium text-[var(--color-crimson)]">
                  {errorMsg}
                </p>
              )}
              {statusMsg && (
                <p role="status" className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-sage)]">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{statusMsg}</span>
                </p>
              )}

              <div className="flex flex-col items-stretch justify-between gap-3 border-t border-[var(--border-subtle)] pt-4 sm:flex-row sm:items-center">
                <p className="text-xs text-[var(--text-secondary)]">
                  Signing out clears this browser’s local copy while keeping your cloud data safe.
                </p>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleSignOut()}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--color-crimson)] hover:text-[var(--color-crimson)] disabled:opacity-60 sm:min-h-9"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Sign out</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Signed-out Auth Flow */}
              {logs.length > 0 && (
                <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-xs text-[var(--text-secondary)]">
                  You have{' '}
                  <strong className="font-semibold text-[var(--text-primary)]">
                    {logs.length} local reading {logs.length === 1 ? 'session' : 'sessions'}
                  </strong>{' '}
                  on this device — they will be preserved and offered for cloud sync when you sign in.
                </div>
              )}

              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void runProviderSignIn(signInWithGoogle, 'Google sign-in failed.')}
                  className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-md border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface)] disabled:opacity-60 sm:min-h-10"
                >
                  <GoogleMark />
                  <span>Continue with Google</span>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void runProviderSignIn(signInWithApple, 'Apple sign-in failed.')}
                  className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-md border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface)] disabled:opacity-60 sm:min-h-10"
                >
                  <AppleMark />
                  <span>Continue with Apple</span>
                </button>
              </div>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-[var(--border-subtle)]" />
                <span className="mx-3 shrink-0 text-xs text-[var(--text-secondary)]">
                  or with email
                </span>
                <div className="flex-grow border-t border-[var(--border-subtle)]" />
              </div>

              {mode !== 'reset' && (
                <div
                  className="grid grid-cols-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 text-xs font-medium"
                  role="tablist"
                  aria-label="Email authentication mode"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'signin'}
                    onClick={() => {
                      setMode('signin');
                      setErrorMsg(null);
                      setStatusMsg(null);
                    }}
                    className={`min-h-9 rounded-[4px] py-1.5 transition-colors sm:min-h-0 ${
                      mode === 'signin'
                        ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'signup'}
                    onClick={() => {
                      setMode('signup');
                      setErrorMsg(null);
                      setStatusMsg(null);
                    }}
                    className={`min-h-9 rounded-[4px] py-1.5 transition-colors sm:min-h-0 ${
                      mode === 'signup'
                        ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Create account
                  </button>
                </div>
              )}

              <form onSubmit={(e) => void handleFormSubmit(e)} className="space-y-3.5">
                {mode === 'signup' && (
                  <div>
                    <label
                      htmlFor="account-name-input"
                      className="block text-xs font-medium text-[var(--text-secondary)]"
                    >
                      Display name (optional)
                    </label>
                    <input
                      id="account-name-input"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      autoComplete="name"
                      maxLength={100}
                      placeholder="How Selah should greet you"
                      className="folio-input mt-1 min-h-11 w-full px-3 py-2 text-base placeholder:text-[var(--text-secondary)] sm:min-h-10 sm:text-sm"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="account-email-input"
                    className="block text-xs font-medium text-[var(--text-secondary)]"
                  >
                    Email address
                  </label>
                  <input
                    id="account-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="folio-input mt-1 min-h-11 w-full px-3 py-2 text-base placeholder:text-[var(--text-secondary)] sm:min-h-10 sm:text-sm"
                  />
                </div>

                {mode !== 'reset' && (
                  <div>
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="account-password-input"
                        className="block text-xs font-medium text-[var(--text-secondary)]"
                      >
                        Password
                      </label>
                      {mode === 'signin' && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode('reset');
                            setErrorMsg(null);
                            setStatusMsg(null);
                          }}
                          className="min-h-8 text-xs font-medium text-[var(--color-accent)] hover:underline sm:min-h-0"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <input
                      id="account-password-input"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                      className="folio-input mt-1 min-h-11 w-full px-3 py-2 text-base placeholder:text-[var(--text-secondary)] sm:min-h-10 sm:text-sm"
                    />
                  </div>
                )}

                {errorMsg && (
                  <p role="alert" className="text-xs font-medium text-[var(--color-crimson)]">
                    {errorMsg}
                  </p>
                )}
                {statusMsg && (
                  <p role="status" className="text-xs font-medium text-[var(--color-sage)]">
                    {statusMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60 sm:min-h-10"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {submitting
                      ? 'Working…'
                      : mode === 'signin'
                        ? 'Sign in with email'
                        : mode === 'signup'
                          ? 'Create Sanctuary account'
                          : 'Send reset link'}
                  </span>
                </button>

                {mode === 'reset' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrorMsg(null);
                      setStatusMsg(null);
                    }}
                    className="w-full text-center text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Back to sign in
                  </button>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </ModalDialog>
  );
};
