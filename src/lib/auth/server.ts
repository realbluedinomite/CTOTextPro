import { cert, getApps, initializeApp, type AppOptions } from 'firebase-admin/app';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';
import type { Prisma, Profile, User, UserAnalytics } from '@prisma/client';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  SESSION_REMEMBER_MAX_AGE_MS,
} from './constants';

export type UserWithProfile = User & {
  profile: Profile | null;
  analytics: UserAnalytics | null;
};

export type AuthenticatedContext = {
  decodedToken: DecodedIdToken;
  user: UserWithProfile;
};

type FirebaseServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

const MIN_SESSION_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const MAX_SESSION_DURATION_MS = SESSION_REMEMBER_MAX_AGE_MS;

export const DEFAULT_PROFILE_PREFERENCES: Prisma.JsonObject = {
  theme: 'system',
  practiceTips: true,
  rememberLastScenario: true,
};

export class AuthenticationError extends Error {
  status: number;

  constructor(message = 'Unauthenticated') {
    super(message);
    this.name = 'AuthenticationError';
    this.status = 401;
  }
}

let cachedServiceAccount: FirebaseServiceAccount | null = null;

function parseServiceAccountJSON(raw: string): FirebaseServiceAccount | null {
  try {
    const parsed = JSON.parse(raw) as Partial<FirebaseServiceAccount & { private_key: string; client_email: string; project_id: string }>;

    if (!parsed) {
      return null;
    }

    const projectId = parsed.projectId ?? parsed.project_id;
    const clientEmail = parsed.clientEmail ?? parsed.client_email;
    const privateKey = parsed.privateKey ?? parsed.private_key;

    if (!projectId || !clientEmail || !privateKey) {
      return null;
    }

    return {
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    } satisfies FirebaseServiceAccount;
  } catch {
    return null;
  }
}

function resolveServiceAccount(): FirebaseServiceAccount {
  if (cachedServiceAccount) {
    return cachedServiceAccount;
  }

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (rawServiceAccount) {
    const parsed = parseServiceAccountJSON(rawServiceAccount);

    if (parsed) {
      cachedServiceAccount = parsed;
      return parsed;
    }
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCP_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin configuration is missing. Provide FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.',
    );
  }

  cachedServiceAccount = { projectId, clientEmail, privateKey } satisfies FirebaseServiceAccount;
  return cachedServiceAccount;
}

function initialiseFirebaseAdmin() {
  const existing = getApps();

  if (existing.length > 0) {
    return existing[0];
  }

  const serviceAccount = resolveServiceAccount();

  const options: AppOptions = {
    credential: cert({
      projectId: serviceAccount.projectId,
      clientEmail: serviceAccount.clientEmail,
      privateKey: serviceAccount.privateKey,
    }),
    projectId: serviceAccount.projectId,
  };

  return initializeApp(options);
}

export function getFirebaseAdminAuth() {
  const app = initialiseFirebaseAdmin();
  return getAuth(app);
}

export function getFirebaseProjectId() {
  return resolveServiceAccount().projectId;
}

export async function verifyIdToken(idToken: string) {
  if (!idToken) {
    throw new AuthenticationError('Missing Firebase ID token');
  }

  return getFirebaseAdminAuth().verifyIdToken(idToken);
}

export async function createSessionCookie(idToken: string, requestedExpiresInMs: number) {
  if (!idToken) {
    throw new AuthenticationError('Missing Firebase ID token');
  }

  const expiresIn = Math.min(
    Math.max(requestedExpiresInMs, MIN_SESSION_DURATION_MS),
    MAX_SESSION_DURATION_MS,
  );

  return getFirebaseAdminAuth().createSessionCookie(idToken, { expiresIn });
}

export async function verifySessionCookie(sessionCookie: string, checkRevoked = true) {
  if (!sessionCookie) {
    throw new AuthenticationError('Missing session cookie');
  }

  return getFirebaseAdminAuth().verifySessionCookie(sessionCookie, checkRevoked);
}

export function setSessionCookie(response: NextResponse, value: string, maxAgeMs: number) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value,
    httpOnly: true,
    maxAge: Math.floor(maxAgeMs / 1000),
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    maxAge: 0,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

function normalisePreferences(preferences: Profile['preferences'] | null | undefined): Record<string, unknown> {
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
    return {};
  }

  return preferences as Record<string, unknown>;
}

export function serialiseUser(user: UserWithProfile) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName ?? user.profile?.displayName ?? null,
    profile: {
      displayName: user.profile?.displayName ?? user.displayName ?? null,
      headline: user.profile?.headline ?? null,
      avatarUrl: user.profile?.avatarUrl ?? null,
      preferences: {
        ...DEFAULT_PROFILE_PREFERENCES,
        ...normalisePreferences(user.profile?.preferences),
      },
    },
    analytics: user.analytics
      ? {
          totalConversations: user.analytics.totalConversations,
          totalScenariosCompleted: user.analytics.totalScenariosCompleted,
          totalBadgesEarned: user.analytics.totalBadgesEarned,
          streakDays: user.analytics.streakDays,
          lastActivityAt: user.analytics.lastActivityAt?.toISOString() ?? null,
        }
      : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function fetchUserWithProfile(uid: string) {
  return prisma.user.findUnique({
    where: { id: uid },
    include: {
      profile: true,
      analytics: true,
    },
  });
}

export async function getAuthenticatedUser(options: { required?: boolean; checkRevoked?: boolean } = {}) {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;

  if (!sessionCookie) {
    if (options.required) {
      throw new AuthenticationError();
    }
    return null;
  }

  try {
    const decoded = await verifySessionCookie(sessionCookie, options.checkRevoked ?? false);
    const userRecord = await fetchUserWithProfile(decoded.uid);

    if (!userRecord) {
      if (options.required) {
        throw new AuthenticationError();
      }

      return null;
    }

    return {
      decodedToken: decoded,
      user: userRecord,
    } satisfies AuthenticatedContext;
  } catch (error) {
    if (options.required) {
      throw new AuthenticationError();
    }

    return null;
  }
}

export async function requireAuthenticatedUser(options: { checkRevoked?: boolean } = {}) {
  const context = await getAuthenticatedUser({ required: true, checkRevoked: options.checkRevoked });

  if (!context) {
    throw new AuthenticationError();
  }

  return context;
}

export { SESSION_MAX_AGE_MS, SESSION_REMEMBER_MAX_AGE_MS };
