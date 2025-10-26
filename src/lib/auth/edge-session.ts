import { importX509, jwtVerify, type JWTPayload, type KeyLike } from 'jose';

import { SESSION_REFRESH_THRESHOLD_MS } from './constants';

const FIREBASE_PUBLIC_KEYS_ENDPOINT = 'https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys';

export type FirebaseSessionPayload = JWTPayload & {
  user_id?: string;
  uid?: string;
  email?: string;
};

export type EdgeSessionVerificationResult = {
  uid: string;
  payload: FirebaseSessionPayload;
  expiresAt: number;
  issuedAt: number | null;
  shouldRefresh: boolean;
};

type KeyCacheEntry = {
  expiresAt: number;
  keys: Map<string, KeyLike>;
};

const keyCache: KeyCacheEntry = {
  expiresAt: 0,
  keys: new Map(),
};

function parseServiceAccountProjectId(): string | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { project_id?: string };
    return parsed.project_id ?? null;
  } catch {
    return null;
  }
}

function getFirebaseProjectIdFromEnv(): string {
  const fromDedicatedVars =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GCP_PROJECT_ID;

  if (fromDedicatedVars) {
    return fromDedicatedVars;
  }

  const fromServiceAccount = parseServiceAccountProjectId();

  if (fromServiceAccount) {
    return fromServiceAccount;
  }

  throw new Error('Firebase project ID is not configured. Set FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID.');
}

async function refreshKeyCache() {
  const response = await fetch(FIREBASE_PUBLIC_KEYS_ENDPOINT, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Unable to download Firebase public keys');
  }

  const data = (await response.json()) as Record<string, string>;
  const entries = await Promise.all(
    Object.entries(data).map(async ([kid, cert]) => {
      const key = (await importX509(cert, 'RS256')) as KeyLike;
      return [kid, key] as const;
    }),
  );

  keyCache.keys = new Map(entries);

  const cacheControl = response.headers.get('cache-control');
  const maxAgeMatch = cacheControl?.match(/max-age=(\d+)/i);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;

  keyCache.expiresAt = Date.now() + maxAgeSeconds * 1000;
}

async function getKeyById(kid: string): Promise<KeyLike> {
  const now = Date.now();

  if (keyCache.keys.has(kid) && keyCache.expiresAt > now) {
    return keyCache.keys.get(kid)!;
  }

  await refreshKeyCache();

  const key = keyCache.keys.get(kid);

  if (!key) {
    throw new Error('Unable to resolve Firebase public key');
  }

  return key;
}

export async function verifySessionCookieOnEdge(sessionCookie: string): Promise<EdgeSessionVerificationResult> {
  if (!sessionCookie) {
    throw new Error('Missing session cookie');
  }

  const projectId = getFirebaseProjectIdFromEnv();
  const issuer = `https://session.firebase.google.com/${projectId}`;

  const { payload } = await jwtVerify(
    sessionCookie,
    async ({ kid }) => {
      if (!kid) {
        throw new Error('Firebase session cookie is missing the key identifier');
      }

      return getKeyById(kid);
    },
    {
      issuer,
      audience: projectId,
    },
  );

  const firebasePayload = payload as FirebaseSessionPayload;
  const uid = (firebasePayload.sub ?? firebasePayload.user_id ?? firebasePayload.uid) as string | undefined;

  if (!uid) {
    throw new Error('Firebase session payload is missing the user identifier');
  }

  if (typeof firebasePayload.exp !== 'number') {
    throw new Error('Firebase session payload is missing an expiry');
  }

  const expiresAt = firebasePayload.exp * 1000;
  const issuedAt = typeof firebasePayload.iat === 'number' ? firebasePayload.iat * 1000 : null;
  const shouldRefresh = expiresAt - Date.now() <= SESSION_REFRESH_THRESHOLD_MS;

  return {
    uid,
    payload: firebasePayload,
    expiresAt,
    issuedAt,
    shouldRefresh,
  } satisfies EdgeSessionVerificationResult;
}
