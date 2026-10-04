import { expect, mock } from 'bun:test';
import { NextRequest } from 'next/server';

mock.module('server-only', () => ({}));
const DAY = 24 * 60 * 60 * 1000;
const discordUser = { id: 'discord-1', username: 'member' };
let account;
let restriction;
let cookieJar = {};
const upserts = [];
mock.module('next/headers', () => ({
  cookies: async () => ({
    get: (name) => (name in cookieJar ? { value: cookieJar[name] } : undefined),
  }),
}));
mock.module('@/db', () => ({
  getModerationRestrictionByDiscordId: async () => restriction,
  getUserByDiscordId: async () => account,
  getUserSettingsByUserId: async () => ({ applicationLanguage: 'en' }),
  isSuspended: (row) =>
    row.suspendedUntil !== null && row.suspendedUntil.getTime() > Date.now(),
  isUserRestricted: () => false,
  upsertDiscordUser: async () => {
    upserts.push(1);
    return { id: 'account-1' };
  },
  upsertUserSettings: async () => {},
}));
mock.module('@/lib/analytics/track.server', () => ({
  trackEvent: async () => {},
}));
mock.module('@/lib/rateLimit', () => ({
  enforceRateLimit: async () => ({ allowed: true }),
  isRateLimited: async () => false,
  requestIp: () => '127.0.0.1',
}));

process.env.AUTH_SECRET = 'test-only';
process.env.DISCORD_CLIENT_ID = 'test-only';
process.env.DISCORD_CLIENT_SECRET = 'test-only';
process.env.DISCORD_REDIRECT_URI = 'http://localhost/api/auth/discord/callback';
globalThis.fetch = async (url) =>
  Response.json(
    String(url).endsWith('/token')
      ? { access_token: 'test-only' }
      : discordUser,
  );

const { GET } = await import('../../src/app/api/auth/discord/callback/route');
const { getCurrentUser } = await import('../../src/lib/auth');
const {
  AUTH_SESSION_COOKIE,
  AUTH_STATE_COOKIE,
  createOAuthStateCookieValue,
  createSessionCookieValue,
} = await import('../../src/lib/auth-session');

const reset = () => {
  account = {
    id: 'account-1',
    discordUserId: discordUser.id,
    suspendedUntil: null,
    bannedAt: null,
  };
  restriction = null;
  upserts.length = 0;
};

const signIn = async () => {
  cookieJar = {
    [AUTH_STATE_COOKIE]: await createOAuthStateCookieValue({
      nonce: 'state-1',
      redirectTo: '/en',
    }),
  };
  return GET(
    new NextRequest(
      'http://localhost/api/auth/discord/callback?code=test&state=state-1',
    ),
  );
};

const sessionUser = async () => {
  cookieJar = {
    [AUTH_SESSION_COOKIE]: await createSessionCookieValue(
      { id: discordUser.id, name: 'Member', username: 'member' },
      'account-1',
    ),
  };
  return getCurrentUser();
};

const future = () => new Date(Date.now() + DAY);
const past = () => new Date(Date.now() - 1000);
const restrictionOf = (values) => ({
  discordUserId: discordUser.id,
  suspendedUntil: null,
  bannedAt: null,
  hiddenByModeration: false,
  ...values,
});

reset();
expect((await signIn()).cookies.get(AUTH_SESSION_COOKIE)).toBeDefined();
expect(await sessionUser()).not.toBeNull();

reset();
account.suspendedUntil = future();
{
  const response = await signIn();
  expect(response.headers.get('location')).toContain('authError=suspended');
  expect(response.cookies.get(AUTH_SESSION_COOKIE)).toBeUndefined();
  expect(upserts).toHaveLength(0);
  expect(await sessionUser()).toBeNull();
}

reset();
account = null;
restriction = restrictionOf({ suspendedUntil: future() });
{
  const response = await signIn();
  expect(response.headers.get('location')).toContain('authError=suspended');
  expect(response.cookies.get(AUTH_SESSION_COOKIE)).toBeUndefined();
}

reset();
restriction = restrictionOf({ suspendedUntil: future() });
expect(await sessionUser()).toBeNull();

reset();
account.suspendedUntil = past();
restriction = restrictionOf({ suspendedUntil: past() });
expect((await signIn()).cookies.get(AUTH_SESSION_COOKIE)).toBeDefined();
expect(await sessionUser()).not.toBeNull();

reset();
restriction = restrictionOf({ suspendedUntil: null });
expect((await signIn()).cookies.get(AUTH_SESSION_COOKIE)).toBeDefined();
expect(await sessionUser()).not.toBeNull();

reset();
restriction = restrictionOf({ hiddenByModeration: true });
expect((await signIn()).cookies.get(AUTH_SESSION_COOKIE)).toBeDefined();
expect(await sessionUser()).not.toBeNull();

console.log('suspension sign-in cases passed');
