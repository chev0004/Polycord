import { beforeAll, describe, expect, it } from 'bun:test';
import { createHmac } from 'node:crypto';
import {
  createOAuthStateCookieValue,
  createSessionCookieValue,
  readOAuthStateFromCookieValue,
  readSessionFromCookieValue,
} from './auth-session';

const user = {
  id: '123456789',
  name: 'Test User',
  username: 'testuser',
  email: 'test@example.com',
};

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret';
});

describe('session cookies', () => {
  it('round-trips a signed session', async () => {
    const value = await createSessionCookieValue(user, 'account-1');

    expect(value).not.toBeNull();

    const restored = await readSessionFromCookieValue(value as string);

    expect(restored).toEqual({ ...user, accountId: 'account-1' });
  });

  it('rejects a tampered payload', async () => {
    const value = (await createSessionCookieValue(user, 'account-1')) as string;
    const [payload, signature] = value.split('.');
    const forged = btoa(
      JSON.stringify({
        user: { ...user, id: 'attacker' },
        expiresAt: Date.now() + 60_000,
      }),
    )
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');

    expect(await readSessionFromCookieValue(`${forged}.${signature}`)).toBe(
      null,
    );
    expect(await readSessionFromCookieValue(`${payload}.AAAA`)).toBe(null);
    expect(await readSessionFromCookieValue('garbage')).toBe(null);
  });

  it('rejects an expired session', async () => {
    const originalNow = Date.now;
    Date.now = () => originalNow() - 40 * 24 * 60 * 60 * 1000;
    const value = (await createSessionCookieValue(user, 'account-1')) as string;
    Date.now = originalNow;

    expect(await readSessionFromCookieValue(value)).toBe(null);
  });

  it('rejects legacy sessions without an account id', async () => {
    const payload = Buffer.from(
      JSON.stringify({
        user,
        expiresAt: Date.now() + 60_000,
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', 'test-secret')
      .update(payload)
      .digest('base64url');

    expect(await readSessionFromCookieValue(`${payload}.${signature}`)).toBe(
      null,
    );
  });

  it('returns null without an auth secret', async () => {
    const secret = process.env.AUTH_SECRET;
    delete process.env.AUTH_SECRET;
    delete process.env.DISCORD_CLIENT_SECRET;

    expect(await createSessionCookieValue(user, 'account-1')).toBe(null);

    process.env.AUTH_SECRET = secret;
  });
});

describe('oauth state cookies', () => {
  it('round-trips the redirect target', async () => {
    const value = await createOAuthStateCookieValue({
      nonce: 'abc123',
      redirectTo: '/en/profile',
    });

    const restored = await readOAuthStateFromCookieValue(value as string);

    expect(restored).toEqual({ nonce: 'abc123', redirectTo: '/en/profile' });
  });
});
