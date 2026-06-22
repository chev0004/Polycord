import { type NextRequest, NextResponse } from 'next/server';
import { getUserSettingsByDiscordUserId, upsertDiscordUser } from '@/db';
import { resolveTheme, THEME_COOKIE } from '@/features/Theme';
import {
  AUTH_ERROR_PARAM,
  clearOAuthStateCookie,
  normalizeDiscordUser,
  readOAuthStateCookie,
  setSessionCookie,
} from '@/lib/auth';
import { locales } from '@/utils/locales';

const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const isSupportedLocale = (value: string): value is (typeof locales)[number] =>
  locales.includes(value as (typeof locales)[number]);

const applyPreferredLocale = (redirectTo: string, preferred: string) => {
  if (!isSupportedLocale(preferred)) {
    return redirectTo;
  }

  const segments = redirectTo.split('/');
  if (segments[1] && isSupportedLocale(segments[1])) {
    segments[1] = preferred;
    return segments.join('/');
  }

  return `/${preferred}${redirectTo}`;
};

type DiscordTokenResponse = {
  access_token?: string;
  token_type?: string;
};

const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_CURRENT_USER_URL = 'https://discord.com/api/users/@me';

const getRedirectUri = (request: NextRequest) =>
  process.env.DISCORD_REDIRECT_URI ??
  new URL('/api/auth/discord/callback', request.nextUrl.origin).toString();

const redirectWithError = (
  request: NextRequest,
  redirectTo: string,
  error: string,
) => {
  const redirectUrl = new URL(redirectTo, request.nextUrl.origin);
  redirectUrl.searchParams.set(AUTH_ERROR_PARAM, error);
  const response = NextResponse.redirect(redirectUrl);
  clearOAuthStateCookie(response);

  return response;
};

const exchangeCodeForToken = async (request: NextRequest, code: string) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: getRedirectUri(request),
  });

  const response = await fetch(DISCORD_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as DiscordTokenResponse;
};

const fetchDiscordUser = async (accessToken: string, tokenType = 'Bearer') => {
  const response = await fetch(DISCORD_CURRENT_USER_URL, {
    headers: {
      Authorization: `${tokenType} ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
};

export const GET = async (request: NextRequest) => {
  const error = request.nextUrl.searchParams.get('error');
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const storedState = await readOAuthStateCookie();
  const redirectTo = storedState?.redirectTo ?? '/en';

  if (error) {
    return redirectWithError(request, redirectTo, 'oauth_cancelled');
  }

  if (!code || !state || state !== storedState?.nonce) {
    return redirectWithError(request, redirectTo, 'oauth_invalid_state');
  }

  try {
    const token = await exchangeCodeForToken(request, code);

    if (!token?.access_token) {
      return redirectWithError(request, redirectTo, 'oauth_failed');
    }

    const discordUser = await fetchDiscordUser(
      token.access_token,
      token.token_type,
    );

    if (!discordUser) {
      return redirectWithError(request, redirectTo, 'oauth_failed');
    }

    const currentUser = normalizeDiscordUser(discordUser);
    await upsertDiscordUser(currentUser);

    const settings = await getUserSettingsByDiscordUserId(currentUser.id);
    const destination = settings
      ? applyPreferredLocale(redirectTo, settings.applicationLanguage)
      : redirectTo;

    const response = NextResponse.redirect(
      new URL(destination, request.nextUrl.origin),
    );
    await setSessionCookie(response, currentUser);
    clearOAuthStateCookie(response);

    if (settings) {
      response.cookies.set(THEME_COOKIE, resolveTheme(settings.theme), {
        path: '/',
        maxAge: THEME_COOKIE_MAX_AGE,
        sameSite: 'lax',
      });
    }

    return response;
  } catch {
    return redirectWithError(request, redirectTo, 'oauth_failed');
  }
};
