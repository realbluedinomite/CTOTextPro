import type { Auth, AuthProvider } from 'firebase/auth';
import {
  GithubAuthProvider,
  GoogleAuthProvider,
  getAuth,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';
import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import { FirebaseError } from 'firebase/app';
import { getApp, getApps, initializeApp } from 'firebase/app';

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let authPersistenceInitialized = false;
let firebaseConfig: FirebaseOptions | null = null;

const TOKEN_STORAGE_KEY = 'protextcoach:auth:idToken';

function parseFirebaseConfig(): FirebaseOptions {
  if (firebaseConfig) {
    return firebaseConfig;
  }

  const rawConfig = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;

  if (!rawConfig) {
    throw new Error('Missing NEXT_PUBLIC_FIREBASE_CONFIG environment variable.');
  }

  try {
    const parsed = JSON.parse(rawConfig) as FirebaseOptions;
    firebaseConfig = parsed;
    return parsed;
  } catch (error) {
    throw new Error('Invalid NEXT_PUBLIC_FIREBASE_CONFIG value. Expected valid JSON.');
  }
}

export function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp;
  }

  const config = parseFirebaseConfig();

  firebaseApp = getApps().length ? getApp() : initializeApp(config);

  return firebaseApp;
}

async function initializePersistence(auth: Auth) {
  if (authPersistenceInitialized) {
    return;
  }

  try {
    await setPersistence(auth, indexedDBLocalPersistence);
  } catch (error) {
    await setPersistence(auth, inMemoryPersistence);
  } finally {
    authPersistenceInitialized = true;
  }
}

export async function getFirebaseAuth(): Promise<Auth> {
  if (firebaseAuth) {
    return firebaseAuth;
  }

  const app = getFirebaseApp();

  firebaseAuth = getAuth(app);
  firebaseAuth.useDeviceLanguage?.();

  await initializePersistence(firebaseAuth);

  return firebaseAuth;
}

export function getGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

export function getGithubProvider() {
  return new GithubAuthProvider();
}

export async function authenticateWithPopup(auth: Auth, provider: AuthProvider) {
  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    if (error instanceof FirebaseError) {
      const fallbackErrors = new Set([
        'auth/popup-blocked',
        'auth/operation-not-supported-in-this-environment',
      ]);

      if (fallbackErrors.has(error.code)) {
        return signInWithRedirect(auth, provider);
      }
    }

    throw error;
  }
}

export { TOKEN_STORAGE_KEY };
