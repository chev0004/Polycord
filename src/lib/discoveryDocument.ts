import 'server-only';

import {
  RequestCookies,
  ResponseCookies,
} from 'next/dist/compiled/@edge-runtime/cookies';
import {
  BAN_DATE_HEADER,
  BAN_LOCALE_HEADER,
  BAN_REFERENCE_HEADER,
} from './auth-session';
import { findBan } from './banGate';
import { measureStartup } from './startupProbe';

export const serveDiscoveryDocument = async (
  request: Request,
  context: { next: (request: Request) => Promise<Response> },
  documents: Record<string, string>,
) => {
  const url = new URL(request.url);
  const locale = url.pathname.match(/^\/(en|ja)(?:\.rsc)?\/?$/)?.[1];
  const cookies = new RequestCookies(request.headers);
  try {
    if (!locale || !documents[locale])
      throw new Error('Missing discovery document');
    const ban = await measureStartup(
      process.env.POLYCORD_DIRECT_BAN_CHECK === 'true'
        ? 'ban-direct'
        : 'ban-http',
      () =>
        findBan(
          url.origin,
          request.headers,
          (name) => cookies.get(name)?.value,
        ),
    );
    if (ban) {
      if (!['GET', 'HEAD'].includes(request.method))
        return Response.json(
          { error: 'Forbidden' },
          { status: 403, headers: { 'Cache-Control': 'no-store' } },
        );
      const denied = new Request(new URL('/banned', url), request);
      denied.headers.set(BAN_LOCALE_HEADER, locale);
      denied.headers.set(BAN_DATE_HEADER, ban.date.toISOString());
      denied.headers.set(BAN_REFERENCE_HEADER, ban.reference);
      denied.headers.set('x-nf-next-middleware', 'skip');
      const response = await context.next(denied);
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-store');
      return new Response(response.body, { status: 403, headers });
    }
    if (
      !['GET', 'HEAD'].includes(request.method) ||
      request.headers.has('rsc') ||
      url.searchParams.has('_rsc') ||
      url.pathname.endsWith('.rsc') ||
      !(
        request.headers.get('sec-fetch-dest') === 'document' ||
        request.headers.get('accept')?.includes('text/html')
      )
    ) {
      request.headers.set('x-nf-next-middleware', 'skip');
      return context.next(request);
    }
    if (url.pathname.endsWith('/'))
      return Response.redirect(new URL(`/${locale}${url.search}`, url), 308);
    const response = new Response(
      request.method === 'HEAD' ? null : documents[locale],
      {
        headers: {
          'Content-Type': 'text/html; charset=UTF-8',
          'Cache-Control': 'public, max-age=0, must-revalidate',
        },
      },
    );
    if (cookies.get('NEXT_LOCALE')?.value !== locale)
      new ResponseCookies(response.headers).set('NEXT_LOCALE', locale, {
        path: '/',
        sameSite: 'lax',
      });
    return response;
  } catch {
    return Response.json(
      { error: 'Temporarily unavailable' },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' },
      },
    );
  }
};
