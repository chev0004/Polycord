import { expect, mock } from 'bun:test';
import { NextRequest } from 'next/server';

mock.module('server-only', () => ({}));
let settings;
let redirectTo;
const writes = [];
mock.module('@/db', () => ({
  getUserByDiscordId: async () => ({ id: 'account-1' }),
  upsertDiscordUser: async () => ({ id: 'account-1' }),
  getUserSettingsByUserId: async () => settings,
  upsertUserSettings: async (...values) => writes.push(values),
}));
mock.module('@/lib/auth', () => ({
  AUTH_ERROR_PARAM: 'authError',
  clearOAuthStateCookie: () => {},
  normalizeDiscordUser: (user) => user,
  readOAuthStateCookie: async () => ({ nonce: 'state-1', redirectTo }),
  setSessionCookie: async () => {},
}));
mock.module('@/lib/analytics/track.server', () => ({
  trackEvent: async () => {},
}));
mock.module('@/lib/rateLimit', () => ({
  enforceRateLimit: async () => ({ allowed: true }),
  isRateLimited: async () => false,
  requestIp: () => '127.0.0.1',
}));

const { GET } = await import('../../src/app/api/auth/discord/callback/route');

settings = { applicationLanguage: 'ja' };
redirectTo = '/en/settings?from=saved#appearance';
process.env.DISCORD_CLIENT_ID = 'test-only';
process.env.DISCORD_CLIENT_SECRET = 'test-only';
process.env.DISCORD_REDIRECT_URI = 'http://localhost/api/auth/discord/callback';
globalThis.fetch = async (url) =>
  Response.json(
    String(url).endsWith('/token')
      ? { access_token: 'test-only' }
      : { id: 'discord-1' },
  );

const signIn = () =>
  GET(
    new NextRequest(
      'http://localhost/api/auth/discord/callback?code=test&state=state-1',
    ),
  );

{
  const response = await signIn();
  expect(response.headers.get('location')).toBe(
    'http://localhost/ja/settings?from=saved#appearance',
  );
  expect(response.cookies.get('NEXT_LOCALE')?.value).toBe('ja');
  expect(writes).toHaveLength(0);
}

settings.applicationLanguage = 'de';
expect((await signIn()).headers.get('location')).toBe(
  'http://localhost/en/settings?from=saved#appearance',
);

{
  settings = null;
  redirectTo = '/ja';
  const response = await signIn();
  expect(response.headers.get('location')).toBe('http://localhost/ja');
  expect(writes).toEqual([['account-1', { applicationLanguage: 'ja' }]]);
}

console.log('locale sign-in cases passed');
