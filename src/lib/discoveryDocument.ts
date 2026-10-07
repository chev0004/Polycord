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
import { createLoadTrace, measureLoad } from './loadTrace';

const locales = ['en', 'ja'];

const preferredLocale = (headers: Headers, cookies: RequestCookies) => {
  const saved = cookies.get('NEXT_LOCALE')?.value;
  if (saved && locales.includes(saved)) return saved;
  const accepted = headers
    .get('accept-language')
    ?.split(',')
    .map((entry) => entry.split(';')[0].trim().split('-')[0].toLowerCase());
  return accepted?.find((tag) => locales.includes(tag)) ?? 'en';
};

export const serveDiscoveryDocument = async (
  request: Request,
  context: { next: (request: Request) => Promise<Response> },
  documents: Record<string, string>,
) => {
  const url = new URL(request.url);
  const locale = url.pathname.match(/^\/(en|ja)(?:\.rsc)?\/?$/)?.[1];
  const cookies = new RequestCookies(request.headers);
  if (url.pathname === '/') {
    if (
      !['GET', 'HEAD'].includes(request.method) ||
      request.headers.has('rsc') ||
      url.searchParams.has('_rsc')
    )
      return context.next(request);
    return new Response(null, {
      status: 307,
      headers: {
        Location: new URL(
          `/${preferredLocale(request.headers, cookies)}${url.search}`,
          url,
        ).href,
        'Cache-Control': 'no-store',
      },
    });
  }
  const trace = await createLoadTrace(request);
  const measure = trace?.measure ?? measureLoad;
  try {
    if (!locale || !documents[locale])
      throw new Error('Missing discovery document');
    const ban = await measure('ban', () =>
      findBan(
        url.origin,
        request.headers,
        (name) => cookies.get(name)?.value,
        trace?.measure,
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
    const traceHeaders = trace?.headers('gate');
    const document = trace
      ? documents[locale].replace(
          '</head>',
          `<script id="polycord-load-trace" type="application/json">${JSON.stringify({ spans: trace.spans, transport: process.env.POLYCORD_DIRECT_BAN_CHECK === 'true' ? 'direct' : 'https' }).replaceAll('<', '\\u003c')}</script></head>`,
        )
      : documents[locale];
    const response = new Response(request.method === 'HEAD' ? null : document, {
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': trace
          ? 'private, no-store'
          : 'public, max-age=0, must-revalidate',
        ...traceHeaders,
      },
    });
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
