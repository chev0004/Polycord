import { type NextRequest, NextResponse } from 'next/server';
import {
  AUTH_ERROR_PARAM,
  createOAuthState,
  setOAuthStateCookie,
} from '@/lib/auth';
import { isLocalePath } from '@/utils/localePaths';
import { locales } from '@/utils/locales';

const DISCORD_AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';

const getLocale = (locale: string | null): (typeof locales)[number] =>
  locales.includes(locale as (typeof locales)[number])
    ? (locale as (typeof locales)[number])
    : 'en';

const getRedirectUri = (request: NextRequest) =>
  process.env.DISCORD_REDIRECT_URI ??
  new URL('/api/auth/discord/callback', request.nextUrl.origin).toString();

const redirectToDiscovery = (
  request: NextRequest,
  locale: string,
  error: string,
) => {
  const redirectUrl = new URL(`/${locale}`, request.nextUrl.origin);
  redirectUrl.searchParams.set(AUTH_ERROR_PARAM, error);

  return NextResponse.redirect(redirectUrl);
};

export const GET = async (request: NextRequest) => {
  const locale = getLocale(request.nextUrl.searchParams.get('locale'));
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!clientId || !process.env.DISCORD_CLIENT_SECRET) {
    return redirectToDiscovery(request, locale, 'oauth_not_configured');
  }

  const next = request.nextUrl.searchParams.get('next');
  const state = createOAuthState(
    next && isLocalePath(next) ? next : `/${locale}`,
  );
  const authorizeUrl = new URL(DISCORD_AUTHORIZE_URL);
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', getRedirectUri(request));
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', 'identify email');
  authorizeUrl.searchParams.set('state', state.nonce);

  const response = NextResponse.redirect(authorizeUrl);
  await setOAuthStateCookie(response, state);

  return response;
};
