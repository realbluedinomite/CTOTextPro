import { FirebaseError } from 'firebase/app';

export function getAuthErrorMessage(error: unknown, fallback: string) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'The email or password you entered is incorrect.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Contact support for assistance.';
      case 'auth/email-already-in-use':
        return 'An account already exists for this email address.';
      case 'auth/weak-password':
        return 'Choose a stronger password with at least 6 characters.';
      case 'auth/popup-blocked':
        return 'Authentication pop-up was blocked. Please allow pop-ups or try the redirect option.';
      case 'auth/popup-closed-by-user':
        return 'The authentication pop-up was closed before completing sign-in.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a moment and try again.';
      default:
        return fallback;
    }
  }

  return fallback;
}
