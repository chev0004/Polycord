import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import {
  AUTH_SESSION_COOKIE,
  readSessionFromCookieValue,
} from './lib/auth-session';
import { locales } from './utils/locales';

export { locales };

const handleI18nRouting = createMiddleware({
  locales,
  defaultLocale: 'en',
});

const protectedRouteSegments = new Set(['onboarding', 'profile', 'settings']);

const getProtectedRouteLocale = (pathname: string) => {
  const [, locale, segment] = pathname.split('/');

  if (
    locales.includes(locale as (typeof locales)[number]) &&
    protectedRouteSegments.has(segment)
  ) {
    return locale;
  }

  return null;
};

export default async function middleware(request: NextRequest) {
  const locale = request.nextUrl.pathname.split('/')[1];
  if (locale && !locales.includes(locale as (typeof locales)[number])) {
    return NextResponse.rewrite(new URL('/_not-found', request.url), {
      status: 404,
    });
  }
  const protectedRouteLocale = getProtectedRouteLocale(
    request.nextUrl.pathname,
  );

  if (protectedRouteLocale) {
    const sessionCookie = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
    const user = sessionCookie
      ? await readSessionFromCookieValue(sessionCookie)
      : null;

    if (!user) {
      const response = NextResponse.redirect(
        new URL(`/${protectedRouteLocale}`, request.url),
      );

      if (sessionCookie) {
        response.cookies.delete(AUTH_SESSION_COOKIE);
      }

      return response;
    }
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
