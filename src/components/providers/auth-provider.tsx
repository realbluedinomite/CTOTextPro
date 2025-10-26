'use client';

import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { User } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { del, get, set, createStore } from 'idb-keyval';

import {
  authenticateWithPopup,
  getFirebaseAuth,
  getGithubProvider,
  getGoogleProvider,
  TOKEN_STORAGE_KEY,
} from '@/lib/firebase-client';

const tokenStore = createStore('protextcoach-auth', 'tokens');

const TOKEN_REFRESH_INTERVAL = 45 * 60 * 1000; // 45 minutes

export type AuthContextValue = {
  user: User | null;
  token: string | null;
  initializing: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signInWithProvider: (provider: 'google' | 'github') => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const authRef = useRef<Awaited<ReturnType<typeof getFirebaseAuth>> | null>(null);

  const stopRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleTokenRefresh = useCallback((currentUser: User | null) => {
    stopRefreshTimer();

    if (!currentUser) {
      return;
    }

    refreshTimerRef.current = setInterval(() => {
      currentUser
        .getIdToken(true)
        .then((freshToken) => {
          setToken(freshToken);
          if (typeof window !== 'undefined') {
            void set(TOKEN_STORAGE_KEY, freshToken, tokenStore).catch(() => {
              // Ignore persistence errors during background refresh.
            });
          }
        })
        .catch(() => {
          // Ignore token refresh errors; Firebase will surface them if needed.
        });
    }, TOKEN_REFRESH_INTERVAL);
  }, [stopRefreshTimer]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    let active = true;
    let unsubscribe: (() => void) | undefined;

    const initialiseAuth = async () => {
      const auth = await getFirebaseAuth();
      authRef.current = auth;

      unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
        if (!active) {
          return;
        }

        setUser(firebaseUser);

        if (firebaseUser) {
          try {
            const idToken = await firebaseUser.getIdToken();
            setToken(idToken);
            await set(TOKEN_STORAGE_KEY, idToken, tokenStore);
          } catch (error) {
            // Swallow storage errors to avoid blocking auth state updates.
          }
        } else {
          setToken(null);
          stopRefreshTimer();
          try {
            await del(TOKEN_STORAGE_KEY, tokenStore);
          } catch (error) {
            // Ignore storage clean-up errors.
          }
        }

        scheduleTokenRefresh(firebaseUser ?? null);
        setInitializing(false);
      });

      try {
        const storedToken = await get(TOKEN_STORAGE_KEY, tokenStore);
        if (storedToken && active) {
          setToken(storedToken);
        }
      } catch (error) {
        // Ignore token hydration errors.
      }
    };

    void initialiseAuth();

    return () => {
      active = false;
      stopRefreshTimer();
      unsubscribe?.();
    };
  }, [scheduleTokenRefresh, stopRefreshTimer]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const auth = authRef.current ?? (await getFirebaseAuth());
    authRef.current = auth;
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUpWithEmail = useCallback(async (name: string, email: string, password: string) => {
    const auth = authRef.current ?? (await getFirebaseAuth());
    authRef.current = auth;

    const credentials = await createUserWithEmailAndPassword(auth, email, password);

    if (credentials.user && name.trim().length) {
      await updateProfile(credentials.user, { displayName: name.trim() });
    }
  }, []);

  const signInWithProvider = useCallback(async (provider: 'google' | 'github') => {
    const auth = authRef.current ?? (await getFirebaseAuth());
    authRef.current = auth;

    const providerInstance = provider === 'google' ? getGoogleProvider() : getGithubProvider();

    await authenticateWithPopup(auth, providerInstance);
  }, []);

  const signOut = useCallback(async () => {
    const auth = authRef.current ?? (await getFirebaseAuth());
    authRef.current = auth;

    await firebaseSignOut(auth);
    stopRefreshTimer();
    try {
      await del(TOKEN_STORAGE_KEY, tokenStore);
    } catch (error) {
      // Ignore storage clean-up errors during sign-out.
    }
    setToken(null);
    setUser(null);
  }, [stopRefreshTimer]);

  const sendPasswordReset = useCallback(async (email: string) => {
    const auth = authRef.current ?? (await getFirebaseAuth());
    authRef.current = auth;

    await sendPasswordResetEmail(auth, email);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      initializing,
      signInWithEmail,
      signUpWithEmail,
      signInWithProvider,
      signOut,
      sendPasswordReset,
    }),
    [initializing, signInWithEmail, signInWithProvider, signOut, signUpWithEmail, sendPasswordReset, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
