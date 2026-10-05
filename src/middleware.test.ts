import { beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { NextRequest } from 'next/server';
import {
  AUTH_SESSION_COOKIE,
  createSessionCookieValue,
} from './lib/auth-session';

let ban: { date: Date; reference: string } | null = null;
let banError: Error | null = null;

const realFetch = globalThis.fetch;

globalThis.fetch = (async (input: URL) => {
  if (new URL(input).pathname !== '/api/internal/ban-check') {
    return realFetch(input);
  }
  if (banError) throw banError;
  return Response.json({
    ban: ban && { date: ban.date.toISOString(), reference: ban.reference },
  });
}) as unknown as typeof fetch;

const { default: middleware } = await import('./middleware');

beforeEach(() => {
  ban = null;
  banError = null;
});

const requestFor = (path: string, sessionCookie?: string, method = 'GET') => {
  const request = new NextRequest(new URL(`http://localhost:3000${path}`), {
    method,
  });

  if (sessionCookie) {
    request.cookies.set(AUTH_SESSION_COOKIE, sessionCookie);
  }

  return request;
};

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret';
});

describe('route guards', () => {
  for (const route of ['/en/profile', '/en/settings', '/en/onboarding']) {
    it(`redirects logged-out visitors away from ${route}`, async () => {
      const response = await middleware(requestFor(route));

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe(
        `http://localhost:3000/en?next=${encodeURIComponent(route)}`,
      );
    });
  }

  it('redirects when the session cookie is invalid', async () => {
    const response = await middleware(
      requestFor('/en/settings', 'not-a-valid-session'),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/en?next=%2Fen%2Fsettings',
    );
  });

  it('lets a valid session through to protected routes', async () => {
    const cookie = (await createSessionCookieValue(
      {
        id: '123',
        name: 'Test User',
      },
      'account-1',
    )) as string;
    const response = await middleware(requestFor('/en/settings', cookie));

    expect(response.headers.get('location')).toBe(null);
  });

  it('does not guard public routes', async () => {
    const response = await middleware(requestFor('/en'));

    expect(response.headers.get('location')).toBe(null);
  });
});

describe('ban gate', () => {
  beforeEach(() => {
    ban = { date: new Date('2026-10-04T00:00:00Z'), reference: 'PC-TEST-0001' };
  });

  it('rewrites page requests to the banned screen with a 403', async () => {
    const response = await middleware(requestFor('/ja/u/someone'));

    expect(response.status).toBe(403);
    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'http://localhost:3000/banned',
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(
      response.headers.get('x-middleware-request-x-polycord-ban-locale'),
    ).toBe('ja');
    expect(
      response.headers.get('x-middleware-request-x-polycord-ban-reference'),
    ).toBe('PC-TEST-0001');
  });

  it('answers apis, files and writes with a bare 403', async () => {
    for (const [path, method] of [
      ['/api/discovery', 'GET'],
      ['/api/saved', 'POST'],
      ['/robots.txt', 'GET'],
      ['/_next/image', 'GET'],
      ['/en', 'POST'],
    ]) {
      const response = await middleware(requestFor(path, undefined, method));

      expect(response.status, `${method} ${path}`).toBe(403);
      expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    }
  });

  it('keeps health, the billing webhook and the ban check reachable', async () => {
    for (const path of [
      '/api/health',
      '/api/billing/webhook',
      '/api/internal/ban-check',
    ]) {
      const response = await middleware(requestFor(path, undefined, 'POST'));

      expect(response.status, path).toBe(200);
    }
  });

  it('passes unbanned visitors through', async () => {
    ban = null;
    const response = await middleware(requestFor('/api/discovery'));

    expect(response.status).toBe(200);
  });
});

describe('ban gate failure', () => {
  beforeEach(() => {
    banError = new Error('timed out');
  });

  it('answers pages and apis with a no-store 503', async () => {
    for (const path of ['/en', '/api/discovery', '/en/settings']) {
      const response = await middleware(requestFor(path));

      expect(response.status, path).toBe(503);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    }
  });

  it('does not affect service routes', async () => {
    const response = await middleware(requestFor('/api/health'));

    expect(response.status).toBe(200);
  });
});
