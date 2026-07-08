import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import {
  AUTH_ERROR_PARAM,
  AUTH_SESSION_COOKIE,
  AUTH_STATE_COOKIE,
  type CurrentUser,
  createOAuthState,
  createOAuthStateCookieValue,
  createSessionCookieValue,
  type OAuthStatePayload,
  readOAuthStateFromCookieValue,
  readSessionFromCookieValue,
  SESSION_DURATION_SECONDS,
  STATE_DURATION_SECONDS,
} from './auth-session';

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  email?: string | null;
};

export {
  AUTH_ERROR_PARAM,
  AUTH_SESSION_COOKIE,
  AUTH_STATE_COOKIE,
  createOAuthState,
  type CurrentUser,
};

const getCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  maxAge,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
});

export const setOAuthStateCookie = (
  response: NextResponse,
  state: OAuthStatePayload,
): Promise<void> => {
  return createOAuthStateCookieValue(state).then((value) => {
    if (!value) {
      return;
    }

    response.cookies.set(
      AUTH_STATE_COOKIE,
      value,
      getCookieOptions(STATE_DURATION_SECONDS),
    );
  });
};

export const readOAuthStateCookie = async () => {
  const cookieStore = await cookies();
  const value = cookieStore.get(AUTH_STATE_COOKIE)?.value;

  if (!value) {
    return null;
  }

  return readOAuthStateFromCookieValue(value);
};

export const clearOAuthStateCookie = (response: NextResponse) => {
  response.cookies.set(AUTH_STATE_COOKIE, '', getCookieOptions(0));
};

export const setSessionCookie = async (
  response: NextResponse,
  user: CurrentUser,
) => {
  const value = await createSessionCookieValue(user);

  if (!value) {
    return;
  }

  response.cookies.set(
    AUTH_SESSION_COOKIE,
    value,
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
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AUTH_SESSION_COOKIE)?.value;

  if (!sessionCookie) {
    return null;
  }

  return readSessionFromCookieValue(sessionCookie);
};

export const getActiveUser = async (): Promise<CurrentUser | null> => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return null;
  }

  const { getUserByDiscordId, isUserRestricted } = await import('@/db');
  const user = await getUserByDiscordId(currentUser.id);

  if (user && isUserRestricted(user)) {
    return null;
  }

  return currentUser;
};
