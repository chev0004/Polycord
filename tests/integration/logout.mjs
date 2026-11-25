import { expect, mock } from 'bun:test';
import { NextRequest } from 'next/server';

mock.module('@/lib/auth', () => ({
  clearSessionCookie: (response) =>
    response.cookies.set('polycord_session', '', { maxAge: 0 }),
}));

const { GET } = await import('../../src/app/api/auth/logout/route');

for (const [query, locale] of [
  ['?locale=ja', 'ja'],
  ['?locale=en', 'en'],
  ['?locale=de', 'en'],
  ['', 'en'],
]) {
  const response = GET(
    new NextRequest(
      `https://deploy-preview--polycord-staging.netlify.app/api/auth/logout${query}`,
    ),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get('location')).toBeNull();
  expect(await response.text()).toBe(
    `<!doctype html><meta http-equiv="refresh" content="0;url=/${locale}">`,
  );
  expect(response.cookies.get('polycord_session')?.value).toBe('');
}

console.log('logout cases passed');
