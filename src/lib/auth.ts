import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { getFirebaseServices, isFirebaseConfigured } from './firebase';
import { isNativePlatform } from './nativeShell';

export interface AccountUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  providerIds: string[];
}

export function isAuthAvailable(): boolean {
  return isFirebaseConfigured();
}

export function toAccountUser(user: User): AccountUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    providerIds: user.providerData.map((p) => p.providerId),
  };
}

export function subscribeToAuthState(
  onChange: (user: AccountUser | null) => void
): () => void {
  const services = getFirebaseServices();
  if (!services) {
    onChange(null);
    return () => {};
  }

  return onAuthStateChanged(services.auth, (firebaseUser) => {
    onChange(firebaseUser ? toAccountUser(firebaseUser) : null);
  });
}

export async function signInWithGoogleAccount(): Promise<AccountUser> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error('Firebase authentication is not configured.');
  }

  if (isNativePlatform()) {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    const result = await FirebaseAuthentication.signInWithGoogle({
      skipNativeAuth: true,
    });
    const idToken = result.credential?.idToken;
    if (!idToken) {
      throw new Error('Google sign-in did not return an identity token.');
    }
    const credential = GoogleAuthProvider.credential(idToken, result.credential?.accessToken);
    const userCred = await signInWithCredential(services.auth, credential);
    return toAccountUser(userCred.user);
  }

  const result = await signInWithPopup(services.auth, services.googleProvider);
  return toAccountUser(result.user);
}

export async function signInWithEmailAccount(
  email: string,
  password: string
): Promise<AccountUser> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error('Firebase authentication is not configured.');
  }
  const result = await signInWithEmailAndPassword(services.auth, email.trim(), password);
  return toAccountUser(result.user);
}

export async function signUpWithEmailAccount(
  email: string,
  password: string,
  displayName?: string
): Promise<AccountUser> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error('Firebase authentication is not configured.');
  }
  const result = await createUserWithEmailAndPassword(services.auth, email.trim(), password);
  const trimmedName = displayName?.trim();
  if (trimmedName) {
    await updateProfile(result.user, { displayName: trimmedName.slice(0, 100) });
    return {
      ...toAccountUser(result.user),
      displayName: trimmedName.slice(0, 100),
    };
  }
  return toAccountUser(result.user);
}

export async function updateAccountDisplayName(displayName: string): Promise<AccountUser> {
  const services = getFirebaseServices();
  if (!services || !services.auth.currentUser) {
    throw new Error('You must be signed in to update your profile.');
  }
  const trimmed = displayName.trim().slice(0, 100);
  await updateProfile(services.auth.currentUser, { displayName: trimmed || null });
  return {
    ...toAccountUser(services.auth.currentUser),
    displayName: trimmed || null,
  };
}

export async function sendAccountPasswordReset(email: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error('Firebase authentication is not configured.');
  }
  await sendPasswordResetEmail(services.auth, email.trim());
}

export async function signOutAccount(): Promise<void> {
  const services = getFirebaseServices();
  if (services) {
    await signOut(services.auth);
  }
  if (isNativePlatform()) {
    try {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      await FirebaseAuthentication.signOut();
    } catch {
      // Ignore native sign-out errors once JS session is cleared
    }
  }
}

export function formatAuthError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code?: unknown }).code ?? '');
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Incorrect email or password. Please check your credentials and try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Try signing in instead.';
      case 'auth/weak-password':
        return 'Choose a stronger password (at least 6 characters).';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a moment before trying again.';
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
      case 'auth/canceled-by-user':
      case '1001':
      case 'ERR_CANCELED':
        return 'Sign-in window was closed before completing.';
      case 'auth/popup-blocked':
        return 'Pop-up was blocked by your browser. Allow pop-ups for this site and try again.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized for sign-in in your Firebase project settings.';
      case 'auth/network-request-failed':
        return 'Network error while connecting to Firebase. Check your connection and try again.';
      default:
        break;
    }
  }
  if (error instanceof Error && /cancel(ed|led)/i.test(error.message)) {
    return 'Sign-in window was closed before completing.';
  }
  return error instanceof Error ? error.message : 'Authentication failed. Please try again.';
}
