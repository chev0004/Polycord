import { beforeAll, describe, expect, it } from 'bun:test';
import { NextRequest } from 'next/server';
import {
  AUTH_SESSION_COOKIE,
  createSessionCookieValue,
} from './lib/auth-session';
import middleware from './middleware';

const requestFor = (path: string, sessionCookie?: string) => {
  const request = new NextRequest(new URL(`http://localhost:3000${path}`));

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
      expect(response.headers.get('location')).toBe('http://localhost:3000/en');
    });
  }

  it('redirects when the session cookie is invalid', async () => {
    const response = await middleware(
      requestFor('/en/settings', 'not-a-valid-session'),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/en');
  });

  it('lets a valid session through to protected routes', async () => {
    const cookie = (await createSessionCookieValue({
      id: '123',
      name: 'Test User',
    })) as string;
    const response = await middleware(requestFor('/en/settings', cookie));

    expect(response.headers.get('location')).toBe(null);
  });

  it('does not guard public routes', async () => {
    const response = await middleware(requestFor('/en'));

    expect(response.headers.get('location')).toBe(null);
  });
});
