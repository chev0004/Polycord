import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import {
  AUTH_SESSION_COOKIE,
  BAN_DATE_HEADER,
  BAN_LOCALE_HEADER,
  BAN_REFERENCE_HEADER,
  readSessionFromCookieValue,
} from './lib/auth-session';
import { BAN_CHECK_PATH, findBan } from './lib/banGate';
import { isGatedPath } from './lib/gatedPaths';
import { createLoadTrace, type LoadMeasure } from './lib/loadTrace';
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

const serviceRoutes = new Set([
  '/api/billing/webhook',
  '/api/health',
  '/api/build',
  BAN_CHECK_PATH,
]);
const nonPageRoute = /^\/(api|_next)(\/|$)|\./;

const denyBanned = (
  request: NextRequest,
  ban: { date: Date; reference: string },
) => {
  const { pathname } = request.nextUrl;
  const noStore = { 'Cache-Control': 'no-store' };

  if (
    nonPageRoute.test(pathname) ||
    !['GET', 'HEAD'].includes(request.method)
  ) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403, headers: noStore },
    );
  }

  const pathLocale = pathname.split('/')[1];
  const headers = new Headers(request.headers);
  headers.set(
    BAN_LOCALE_HEADER,
    locales.includes(pathLocale as (typeof locales)[number])
      ? pathLocale
      : (request.cookies.get('NEXT_LOCALE')?.value ?? 'en'),
  );
  headers.set(BAN_DATE_HEADER, ban.date.toISOString());
  headers.set(BAN_REFERENCE_HEADER, ban.reference);

  return NextResponse.rewrite(new URL('/banned', request.url), {
    status: 403,
    headers: noStore,
    request: { headers },
  });
};

async function routeMiddleware(request: NextRequest, measure: LoadMeasure) {
  if (
    !serviceRoutes.has(request.nextUrl.pathname) &&
    !isGatedPath(request.nextUrl.pathname)
  ) {
    try {
      const ban = await measure('ban', () =>
        findBan(
          request.nextUrl.origin,
          request.headers,
          (name) => request.cookies.get(name)?.value,
          measure,
        ),
      );

      if (ban) {
        return denyBanned(request, ban);
      }
    } catch {
      return NextResponse.json(
        { error: 'Temporarily unavailable' },
        {
          status: 503,
          headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' },
        },
      );
    }
  }

  if (request.nextUrl.pathname.startsWith('/__discovery_shell')) {
    return new NextResponse(null, {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  if (nonPageRoute.test(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const locale = request.nextUrl.pathname.split('/')[1];
  if (locale && !locales.includes(locale as (typeof locales)[number])) {
    return NextResponse.rewrite(new URL('/en/missing', request.url), {
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
        new URL(
          `/${protectedRouteLocale}?next=${encodeURIComponent(request.nextUrl.pathname)}`,
          request.url,
        ),
      );

      if (sessionCookie) {
        response.cookies.delete(AUTH_SESSION_COOKIE);
      }

      return response;
    }
  }

  return handleI18nRouting(request);
}

export default async function middleware(request: NextRequest) {
  const trace = await createLoadTrace(request);
  const response = await routeMiddleware(
    request,
    trace?.measure ?? (async (_name, run) => run()),
  );
  if (trace) {
    const serverTiming = trace.headers('gate')['Server-Timing'];
    response.headers.set('x-polycord-load-gate', serverTiming);
    response.headers.set('Server-Timing', serverTiming);
    response.headers.set('Cache-Control', 'private, no-store');
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|favicon.ico|polycord-wordmark.svg).*)'],
  runtime: 'nodejs',
};
