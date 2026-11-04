import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { NextRequest } from 'next/server';
import nextConfig from '../next.config';
import { profileSchema } from '../src/features/Profile/schema';
import {
  createSessionCookieValue,
  readSessionFromCookieValue,
} from '../src/lib/auth-session';
import { moderationSchema } from '../src/lib/moderationRequest';

const realFetch = globalThis.fetch;
const saved = {
  AUTH_SECRET: process.env.AUTH_SECRET,
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
};
const restore = (key) => {
  if (saved[key] === undefined) delete process.env[key];
  else process.env[key] = saved[key];
};
mock.module('server-only', () => ({}));

beforeAll(() => {
  process.env.AUTH_SECRET = 'security-test-secret';
  globalThis.fetch = async () => Response.json({ ban: null });
});

afterAll(() => {
  globalThis.fetch = realFetch;
  restore('AUTH_SECRET');
  restore('DISCORD_CLIENT_SECRET');
});

const { default: middleware } = await import('../src/middleware');

const apiRequest = (method, headers = {}) =>
  new NextRequest('https://polycord.chev.dev/api/profile', {
    method,
    headers: { host: 'polycord.chev.dev', ...headers },
  });

describe('cross-origin API writes', () => {
  for (const origin of [
    'https://evil.example',
    'https://other.chev.dev',
    'null',
  ]) {
    for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
      test(`rejects ${method} from ${origin}`, async () => {
        const response = await middleware(apiRequest(method, { origin }));
        expect(response.status).toBe(403);
      });
    }
  }

  test('allows same-origin writes', async () => {
    const response = await middleware(
      apiRequest('POST', { origin: 'https://polycord.chev.dev' }),
    );
    expect(response.status).toBe(200);
  });

  test('allows writes without a browser origin', async () => {
    const response = await middleware(apiRequest('POST'));
    expect(response.status).toBe(200);
  });

  test('allows cross-origin reads', async () => {
    const response = await middleware(
      apiRequest('GET', { origin: 'https://evil.example' }),
    );
    expect(response.status).toBe(200);
  });
});

describe('response headers', () => {
  test('forbid framing and hide the framework', async () => {
    const [all] = await nextConfig.headers();
    expect(all.source).toBe('/:path*');
    expect(all.headers).toEqual(
      expect.arrayContaining([
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
      ]),
    );
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});

describe('session cookies', () => {
  const identity = { id: 'discord-1', name: 'Synthetic', email: 'a@b.test' };

  test('do not carry the account email', async () => {
    const value = await createSessionCookieValue(identity, 'account-1');
    const payload = JSON.parse(
      Buffer.from(value.split('.')[0], 'base64url').toString(),
    );
    expect(payload.user).toEqual({
      id: 'discord-1',
      name: 'Synthetic',
      accountId: 'account-1',
    });
    expect((await readSessionFromCookieValue(value)).accountId).toBe(
      'account-1',
    );
  });

  test('are never signed with the Discord client secret', async () => {
    const value = await createSessionCookieValue(identity, 'account-1');
    delete process.env.AUTH_SECRET;
    process.env.DISCORD_CLIENT_SECRET = 'discord-only';
    try {
      expect(await createSessionCookieValue(identity, 'account-1')).toBeNull();
      expect(await readSessionFromCookieValue(value)).toBeNull();
    } finally {
      process.env.AUTH_SECRET = 'security-test-secret';
      restore('DISCORD_CLIENT_SECRET');
    }
  });
});

describe('oversized request bodies', () => {
  test('fail on the collection limit instead of every element', () => {
    const profile = profileSchema.safeParse({
      isPublic: true,
      allowAnonymousCopy: true,
      displayTimezone: true,
      displayAvailability: true,
      primaryLanguage: 'en',
      targetLanguages: [{ language: 'ja', level: 'beginner' }],
      bio: 'A synthetic profile bio for testing.',
      tags: Array.from({ length: 200000 }, () => 0),
    });
    const moderation = moderationSchema.safeParse({
      userId: crypto.randomUUID(),
      action: 'dismiss',
      reportIds: Array.from({ length: 200000 }, () => 0),
    });
    expect(profile.error.issues.length).toBeLessThan(5);
    expect(moderation.error.issues.length).toBeLessThan(5);
  });
});

for (const [script, message] of [
  ['security-database', 'database security passed'],
  ['security-moderation', 'moderation privilege boundaries passed'],
  ['security-analytics', 'analytics throttle passed'],
]) {
  test.skipIf(!process.env.TEST_DATABASE_URL)(
    script,
    () => {
      expect(
        execFileSync(
          process.execPath,
          ['run', `tests/integration/${script}.mjs`],
          {
            encoding: 'utf8',
            timeout: 60000,
          },
        ),
      ).toContain(message);
    },
    60000,
  );
}
