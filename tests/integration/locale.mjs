import { expect, mock } from 'bun:test';
import { NextRequest } from 'next/server';

mock.module('server-only', () => ({}));
mock.module('@/db/client', () => ({ scopedRoute: (handler) => handler }));
let settings;
let redirectTo;
const writes = [];
const devCookies = [];
mock.module('@/db', () => ({
  getUserByDiscordId: async () => ({ id: 'account-1' }),
  recordIpObservation: async () => {},
  upsertDiscordUser: async () => ({ id: 'account-1' }),
  getUserSettingsByUserId: async () => settings,
  upsertUserSettings: async (...values) => writes.push(values),
}));
mock.module('@/lib/auth', () => ({
  AUTH_ERROR_PARAM: 'authError',
  clearOAuthStateCookie: () => {},
  getIdentityRestriction: async () => null,
  normalizeDiscordUser: (user) => user,
  readOAuthStateCookie: async () => ({ nonce: 'state-1', redirectTo }),
  setBanCookie: async () => {},
  setDevCookie: (_response, toggles) => devCookies.push(toggles),
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
      'http://localhost/api/auth/discord/callback?code=test&state=state-1&iss=https%3A%2F%2Fdiscord.com',
    ),
  );
const destination = async (response) =>
  (await response.text()).match(/content="0;url=([^"]*)"/)[1];

{
  const response = await signIn();
  expect(response.status).toBe(200);
  expect(response.headers.get('location')).toBeNull();
  expect(await response.clone().text()).toStartWith(
    '<!doctype html><meta name="referrer" content="no-referrer"><meta http-equiv="refresh"',
  );
  expect(await destination(response)).toBe(
    'http://localhost/ja/settings?from=saved#appearance',
  );
  expect(response.cookies.get('NEXT_LOCALE')?.value).toBe('ja');
  expect(writes).toHaveLength(0);
}

settings.applicationLanguage = 'de';
expect(await destination(await signIn())).toBe(
  'http://localhost/en/settings?from=saved#appearance',
);

{
  settings = null;
  redirectTo = '/ja';
  const response = await signIn();
  expect(await destination(response)).toBe('http://localhost/ja');
  expect(writes).toEqual([['account-1', { applicationLanguage: 'ja' }]]);
}

redirectTo = '/en/settings?tab=profile&from=saved';
expect(await destination(await signIn())).toBe(
  'http://localhost/en/settings?tab=profile&amp;from=saved',
);

settings = { applicationLanguage: 'en', loadTracing: true };
redirectTo = '/en';
devCookies.length = 0;
await signIn();
expect(devCookies).toHaveLength(0);
process.env.POLYCORD_ADMIN_USER_IDS = 'discord-1';
await signIn();
expect(devCookies).toEqual([{ loadTracing: true, discoverySkeleton: false }]);

console.log('locale sign-in cases passed');
