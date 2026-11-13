import React, { useEffect, useState } from 'react';
import type { AccountUser } from '../../lib/auth';

/** Derive up to two monogram initials from a display name or email address. */
export function getAccountInitials(displayName: string | null, email: string | null): string {
  const source = (displayName || email || 'S').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

interface ProfileAvatarProps {
  user: Pick<AccountUser, 'photoURL' | 'displayName' | 'email'>;
  sizeClassName?: string;
  textClassName?: string;
  interactive?: boolean;
}

/** Circular user profile picture with automatic serif-monogram fallback when no photo loads. */
export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  user,
  sizeClassName = 'h-9 w-9',
  textClassName = 'text-sm',
  interactive = false,
}) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  useEffect(() => {
    setFailedUrl(null);
  }, [user.photoURL]);

  const showImage = Boolean(user.photoURL) && failedUrl !== user.photoURL;

  if (showImage && user.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailedUrl(user.photoURL)}
        className={`${sizeClassName} shrink-0 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] object-cover transition-colors ${
          interactive ? 'group-hover:border-[var(--border-strong)]' : ''
        }`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`flex ${sizeClassName} shrink-0 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--color-accent)_45%,var(--border-subtle))] bg-[var(--color-accent-soft)] font-display ${textClassName} font-medium tracking-tight text-[var(--color-accent)] transition-colors ${
        interactive ? 'group-hover:border-[var(--color-accent)]' : ''
      }`}
    >
      {getAccountInitials(user.displayName, user.email)}
    </span>
  );
};
