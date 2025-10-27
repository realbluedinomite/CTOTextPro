import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import {
  AuthenticationError,
  DEFAULT_PROFILE_PREFERENCES,
  clearSessionCookie,
  createSessionCookie,
  fetchUserWithProfile,
  getFirebaseAdminAuth,
  serialiseUser,
  setSessionCookie,
  verifyIdToken,
  verifySessionCookie,
} from '@/lib/auth/server';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS, SESSION_REMEMBER_MAX_AGE_MS } from '@/lib/auth/constants';

const FALLBACK_EMAIL_DOMAIN = 'users.firebaseapp.local';

function buildSafeEmail(uid: string) {
  return `${uid}@${FALLBACK_EMAIL_DOMAIN}`;
}

type CreateSessionPayload = {
  idToken?: string;
  remember?: boolean;
};

export async function POST(request: Request) {
  let payload: CreateSessionPayload | null = null;

  try {
    payload = (await request.json()) as CreateSessionPayload;
  } catch (error) {
    console.error('Failed to parse /api/auth/session payload', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const idToken = payload?.idToken;

  if (!idToken) {
    return NextResponse.json({ error: 'Firebase ID token is required' }, { status: 400 });
  }

  const remember = Boolean(payload?.remember);

  try {
    const decoded = await verifyIdToken(idToken);
    const uid = decoded.uid;

    const email = decoded.email ?? buildSafeEmail(uid);
    const displayName =
      decoded.name ??
      (typeof decoded.email === 'string' && decoded.email.includes('@')
        ? decoded.email.split('@')[0]
        : uid);
    const avatarUrl = typeof decoded.picture === 'string' ? decoded.picture : null;

    const userWithRelations = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({ where: { id: uid } });
      const userRecord = existingUser
        ? await tx.user.update({
            where: { id: uid },
            data: {
              email,
              displayName: existingUser.displayName ?? displayName,
            },
          })
        : await tx.user.create({
            data: {
              id: uid,
              email,
              displayName,
            },
          });

      const existingProfile = await tx.profile.findUnique({ where: { userId: userRecord.id } });

      if (existingProfile) {
        await tx.profile.update({
          where: { userId: userRecord.id },
          data: {
            displayName: existingProfile.displayName ?? displayName,
            avatarUrl: existingProfile.avatarUrl ?? avatarUrl,
            preferences: existingProfile.preferences ?? DEFAULT_PROFILE_PREFERENCES,
          },
        });
      } else {
        await tx.profile.create({
          data: {
            userId: userRecord.id,
            displayName,
            avatarUrl,
            preferences: DEFAULT_PROFILE_PREFERENCES,
          },
        });
      }

      await tx.userAnalytics.upsert({
        where: { userId: userRecord.id },
        update: {},
        create: {
          userId: userRecord.id,
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: userRecord.id },
        include: { profile: true, analytics: true },
      });
    });

    const expiresIn = remember ? SESSION_REMEMBER_MAX_AGE_MS : SESSION_MAX_AGE_MS;
    const sessionCookie = await createSessionCookie(idToken, expiresIn);

    const response = NextResponse.json({ user: serialiseUser(userWithRelations) });

    setSessionCookie(response, sessionCookie, expiresIn);

    return response;
  } catch (error) {
    console.error('Failed to create Firebase session cookie', error);

    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Unable to establish session' }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;

  if (!sessionCookie) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  try {
    const decoded = await verifySessionCookie(sessionCookie, false);
    const userRecord = await fetchUserWithProfile(decoded.uid);

    if (!userRecord) {
      const response = NextResponse.json({ user: null }, { status: 200 });
      clearSessionCookie(response);
      return response;
    }

    return NextResponse.json({ user: serialiseUser(userRecord) });
  } catch (error) {
    console.error('Failed to verify existing session cookie', error);
    const response = NextResponse.json({ user: null }, { status: 401 });
    clearSessionCookie(response);
    return response;
  }
}

export async function DELETE() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  const response = NextResponse.json({ success: true });

  if (!sessionCookie) {
    clearSessionCookie(response);
    return response;
  }

  try {
    const decoded = await verifySessionCookie(sessionCookie, false);
    await getFirebaseAdminAuth().revokeRefreshTokens(decoded.uid);
  } catch (error) {
    console.warn('Failed to revoke Firebase refresh tokens during logout', error);
  }

  clearSessionCookie(response);
  return response;
}
