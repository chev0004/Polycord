import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

export type CurrentUser = {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  email?: string;
};

type SessionPayload = {
  user: CurrentUser;
  expiresAt: number;
};

type OAuthStatePayload = {
  nonce: string;
  redirectTo: string;
};

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  email?: string | null;
};

export const AUTH_SESSION_COOKIE = 'polycord_session';
export const AUTH_STATE_COOKIE = 'polycord_oauth_state';
export const AUTH_ERROR_PARAM = 'authError';

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;
const STATE_DURATION_SECONDS = 60 * 10;

const getCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  maxAge,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
});

const getAuthSecret = () =>
  process.env.AUTH_SECRET ?? process.env.DISCORD_CLIENT_SECRET;

const sign = (value: string, secret: string) =>
  createHmac('sha256', secret).update(value).digest('base64url');

const signPayload = <T>(payload: T, secret: string) => {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  );

  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
};

const verifyPayload = <T>(value: string, secret: string): T | null => {
  const [encodedPayload, signature] = value.split('.');

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString()) as T;
  } catch {
    return null;
  }
};

export const createOAuthState = (redirectTo: string) => ({
  nonce: randomBytes(24).toString('base64url'),
  redirectTo,
});

export const setOAuthStateCookie = (
  response: NextResponse,
  state: OAuthStatePayload,
) => {
  const secret = getAuthSecret();

  if (!secret) {
    return;
  }

  response.cookies.set(
    AUTH_STATE_COOKIE,
    signPayload(state, secret),
    getCookieOptions(STATE_DURATION_SECONDS),
  );
};

export const readOAuthStateCookie = async () => {
  const secret = getAuthSecret();

  if (!secret) {
    return null;
  }

  const cookieStore = await cookies();
  const value = cookieStore.get(AUTH_STATE_COOKIE)?.value;

  if (!value) {
    return null;
  }

  return verifyPayload<OAuthStatePayload>(value, secret);
};

export const clearOAuthStateCookie = (response: NextResponse) => {
  response.cookies.set(AUTH_STATE_COOKIE, '', getCookieOptions(0));
};

export const setSessionCookie = (response: NextResponse, user: CurrentUser) => {
  const secret = getAuthSecret();

  if (!secret) {
    return;
  }

  const session: SessionPayload = {
    user,
    expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000,
  };

  response.cookies.set(
    AUTH_SESSION_COOKIE,
    signPayload(session, secret),
    getCookieOptions(SESSION_DURATION_SECONDS),
  );
};

export const clearSessionCookie = (response: NextResponse) => {
  response.cookies.set(AUTH_SESSION_COOKIE, '', getCookieOptions(0));
};

export const normalizeDiscordUser = (discordUser: DiscordUser): CurrentUser => {
  const avatarUrl = discordUser.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.${discordUser.avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`
    : undefined;

  return {
    id: discordUser.id,
    name: discordUser.global_name ?? discordUser.username,
    username: discordUser.username,
    avatarUrl,
    email: discordUser.email ?? undefined,
  };
};

export const getCurrentUser = async (): Promise<CurrentUser | null> => {
  const secret = getAuthSecret();

  if (!secret) {
    return null;
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AUTH_SESSION_COOKIE)?.value;

  if (!sessionCookie) {
    return null;
  }

  const session = verifyPayload<SessionPayload>(sessionCookie, secret);

  if (!session || session.expiresAt < Date.now()) {
    return null;
  }

  return session.user;
};
