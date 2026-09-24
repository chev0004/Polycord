import { type NextRequest, NextResponse } from 'next/server';
import {
  getUserByDiscordId,
  getUserSettingsByUserId,
  upsertDiscordUser,
  upsertUserSettings,
} from '@/db';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { localeFromPath } from '@/lib/analytics/locale';
import { trackEvent } from '@/lib/analytics/track.server';
import {
  AUTH_ERROR_PARAM,
  clearOAuthStateCookie,
  normalizeDiscordUser,
  readOAuthStateCookie,
  setSessionCookie,
} from '@/lib/auth';
import { enforceRateLimit, isRateLimited, requestIp } from '@/lib/rateLimit';
import { isLocale, localizePath } from '@/utils/localePaths';

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
  const redirectUrl = new URL(redirectTo, getRedirectUri(request));
  redirectUrl.searchParams.set(AUTH_ERROR_PARAM, error);
  const response = NextResponse.redirect(redirectUrl, 303);
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
  const ip = requestIp(request);

  const redirectWithFailure = async (failure: string) => {
    const limit = await enforceRateLimit('auth-failure', { ip });
    return redirectWithError(
      request,
      redirectTo,
      limit.allowed ? failure : 'oauth_rate_limited',
    );
  };

  if (error) {
    return redirectWithFailure('oauth_cancelled');
  }

  if (!code || !state || state !== storedState?.nonce) {
    return redirectWithFailure('oauth_invalid_state');
  }

  if (await isRateLimited('auth-failure', { ip })) {
    return redirectWithError(request, redirectTo, 'oauth_rate_limited');
  }

  try {
    const token = await exchangeCodeForToken(request, code);

    if (!token?.access_token) {
      return redirectWithFailure('oauth_failed');
    }

    const discordUser = await fetchDiscordUser(
      token.access_token,
      token.token_type,
    );

    if (!discordUser) {
      return redirectWithFailure('oauth_failed');
    }

    const currentUser = normalizeDiscordUser(discordUser);
    const existingUser = await getUserByDiscordId(currentUser.id);
    const user = await upsertDiscordUser(currentUser);
    const settings = await getUserSettingsByUserId(user.id);
    const requestedLocale = localeFromPath(redirectTo) ?? 'en';
    const locale =
      settings && isLocale(settings.applicationLanguage)
        ? settings.applicationLanguage
        : isLocale(requestedLocale)
          ? requestedLocale
          : 'en';
    if (!settings) {
      await upsertUserSettings(user.id, { applicationLanguage: locale });
    }

    await trackEvent({
      name: existingUser
        ? ANALYTICS_EVENTS.authLogin
        : ANALYTICS_EVENTS.authSignup,
      userId: user.id,
      locale,
      metadata: { isNewUser: !existingUser },
    });

    const response = NextResponse.redirect(
      new URL(localizePath(redirectTo, locale), getRedirectUri(request)),
      303,
    );
    await setSessionCookie(response, currentUser, user.id);
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      sameSite: 'lax',
      maxAge: 31536000,
    });
    clearOAuthStateCookie(response);

    return response;
  } catch {
    return redirectWithFailure('oauth_failed');
  }
};
