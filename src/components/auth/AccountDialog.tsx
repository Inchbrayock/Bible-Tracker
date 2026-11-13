import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Cloud,
  CloudOff,
  Edit3,
  LogOut,
  Mail,
  RefreshCw,
  Settings,
  UserCheck,
  X,
} from 'lucide-react';
import { SPRING_TACTILE, TACTILE_PILL_TAP, TACTILE_TAP } from '../../lib/motion';
import { useBibleStore } from '../../store/useBibleStore';
import { ProfileAvatar } from '../ui/ProfileAvatar';

interface AccountDialogProps {
  open: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

interface PopoverPlacement {
  top: number;
  right: number;
  maxWidth: number;
  maxHeight: number;
}

const POPOVER_MAX_WIDTH = 368;
const VIEWPORT_MARGIN = 12;

function computePopoverPlacement(anchor: HTMLElement | null | undefined): PopoverPlacement {
  if (typeof window === 'undefined') {
    return { top: 64, right: 16, maxWidth: POPOVER_MAX_WIDTH, maxHeight: 640 };
  }

  const vw = document.documentElement?.clientWidth || window.innerWidth;
  const vh = document.documentElement?.clientHeight || window.innerHeight;
  const clampedMaxWidth = Math.min(POPOVER_MAX_WIDTH, Math.max(240, vw - VIEWPORT_MARGIN * 2));
  const rect = anchor?.getBoundingClientRect();

  if (!rect || (rect.width === 0 && rect.height === 0)) {
    return {
      top: 64,
      right: 16,
      maxWidth: clampedMaxWidth,
      maxHeight: Math.max(260, vh - 80),
    };
  }

  const top = Math.max(VIEWPORT_MARGIN, Math.round(rect.bottom + 8));
  const desiredRight = Math.max(VIEWPORT_MARGIN, Math.round(vw - rect.right));
  const maxPossibleRight = Math.max(VIEWPORT_MARGIN, vw - VIEWPORT_MARGIN - clampedMaxWidth);
  const right = Math.min(desiredRight, maxPossibleRight);
  const maxWidth = Math.min(POPOVER_MAX_WIDTH, Math.max(240, vw - right - VIEWPORT_MARGIN));
  const maxHeight = Math.max(260, vh - top - VIEWPORT_MARGIN);

  return { top, right, maxWidth, maxHeight };
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

export const AccountDialog: React.FC<AccountDialogProps> = ({
  open,
  onClose,
  onOpenSettings,
  anchorRef,
}) => {
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
  const [placement, setPlacement] = useState<PopoverPlacement>(() =>
    computePopoverPlacement(anchorRef?.current)
  );

  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  const updatePlacement = useCallback(() => {
    setPlacement(computePopoverPlacement(anchorRef?.current));
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, { passive: true });
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement);
    };
  }, [open, updatePlacement]);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      panelRef.current?.focus({ preventScroll: true });
    }
    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleOutsidePress = (e: Event) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target) || anchorRef?.current?.contains(target)) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        requestAnimationFrame(() => anchorRef?.current?.focus());
      }
    };

    document.addEventListener('pointerdown', handleOutsidePress);
    document.addEventListener('mousedown', handleOutsidePress);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePress);
      document.removeEventListener('mousedown', handleOutsidePress);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (open) {
      setErrorMsg(null);
      setStatusMsg(null);
      setEditingName(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && !editingName) {
      setNameDraft(user?.displayName ?? '');
    }
  }, [open, editingName, user?.displayName]);

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

  const popoverContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-labelledby="account-dialog-title"
          tabIndex={-1}
          data-testid="account-popover"
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={SPRING_TACTILE}
          style={{
            top: `${placement.top}px`,
            right: `${placement.right}px`,
            width: `${placement.maxWidth}px`,
            maxHeight: `${placement.maxHeight}px`,
          }}
          className="fixed z-50 flex origin-top-right flex-col overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[0_20px_48px_-12px_rgba(12,16,24,0.28),0_4px_14px_-4px_rgba(12,16,24,0.12)] outline-none"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3.5 sm:px-5">
            <div className="min-w-0">
              <h2
                id="account-dialog-title"
                className="font-display text-xl font-medium text-[var(--text-primary)]"
              >
                {user ? 'Your Sanctuary Account' : 'Save Your Reading Ledger'}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {user
                  ? 'Readings, study notes, plans, and seals stay synced to your account.'
                  : 'Sign in or create an account to back up and sync across devices.'}
              </p>
            </div>
            <motion.button
              type="button"
              whileTap={TACTILE_PILL_TAP}
              onClick={onClose}
              aria-label="Close account dialog"
              className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </motion.button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
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
                <ProfileAvatar user={user} sizeClassName="h-11 w-11" textClassName="text-base" />

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
                <motion.button
                  type="button"
                  whileTap={TACTILE_TAP}
                  transition={SPRING_TACTILE}
                  disabled={submitting}
                  onClick={() => void runProviderSignIn(signInWithGoogle, 'Google sign-in failed.')}
                  className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-md border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface)] disabled:opacity-60 sm:min-h-10"
                >
                  <GoogleMark />
                  <span>Continue with Google</span>
                </motion.button>
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
                  {(
                    [
                      { id: 'signin', label: 'Sign in' },
                      { id: 'signup', label: 'Create account' },
                    ] as const
                  ).map((tabOpt) => {
                    const isActive = mode === tabOpt.id;
                    return (
                      <button
                        key={tabOpt.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => {
                          setMode(tabOpt.id);
                          setErrorMsg(null);
                          setStatusMsg(null);
                        }}
                        className={`relative min-h-9 rounded-[4px] py-1.5 transition-colors sm:min-h-0 ${
                          isActive
                            ? 'text-[var(--text-primary)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="auth-mode-pill"
                            transition={SPRING_TACTILE}
                            aria-hidden="true"
                            className="absolute inset-0 rounded-[4px] bg-[var(--bg-elevated)] shadow-2xs"
                          />
                        )}
                        <span className="relative z-10">{tabOpt.label}</span>
                      </button>
                    );
                  })}
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

                <motion.button
                  type="submit"
                  whileTap={TACTILE_TAP}
                  transition={SPRING_TACTILE}
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
                </motion.button>

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

          {onOpenSettings && (
            <div className="border-t border-[var(--border-subtle)] pt-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="group flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--bg-surface)] text-[var(--text-secondary)] transition-colors group-hover:text-[var(--color-accent)]">
                    <Settings className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-[var(--text-primary)]">
                      Settings
                    </span>
                    <span className="block truncate text-xs text-[var(--text-secondary)]">
                      Theme, reading cadence, data &amp; updates
                    </span>
                  </span>
                </span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)]"
                  aria-hidden="true"
                />
              </button>
            </div>
          )}

          {firebaseAvailable && user && (
            <div className="flex flex-col items-stretch justify-between gap-3 border-t border-[var(--border-subtle)] pt-3.5 sm:flex-row sm:items-center">
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
          )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return createPortal(popoverContent, document.body);
  }
  return popoverContent;
};
