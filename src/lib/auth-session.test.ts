import { beforeAll, describe, expect, it } from 'bun:test';
import { createHmac } from 'node:crypto';
import {
  createOAuthStateCookieValue,
  createSessionCookieValue,
  readOAuthStateFromCookieValue,
  readSessionFromCookieValue,
  reissueLegacySessionCookieValue,
} from './auth-session';

const user = {
  id: '123456789',
  name: 'Test User',
  username: 'testuser',
};

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret';
});

describe('session cookies', () => {
  it('round-trips a signed session', async () => {
    const value = await createSessionCookieValue(user, 'account-1');

    expect(value).not.toBeNull();

    const restored = await readSessionFromCookieValue(value as string);
    expect(restored).toEqual({
      ...user,
      accountId: 'account-1',
      issuedAt: expect.any(Number),
    });
  });

  it('drops the email from legacy sessions and reissues them without it', async () => {
    const legacyExpiry = Date.now() + 60_000;
    const payload = Buffer.from(
      JSON.stringify({
        user: { ...user, email: 'test@example.com', accountId: 'account-1' },
        expiresAt: legacyExpiry,
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', 'test-secret')
      .update(payload)
      .digest('base64url');
    const legacy = `${payload}.${signature}`;

    expect(await readSessionFromCookieValue(legacy)).not.toHaveProperty(
      'email',
    );

    const reissued = await reissueLegacySessionCookieValue(legacy);
    expect(reissued?.expiresAt).toBe(legacyExpiry);
    expect(atob((reissued?.value as string).split('.')[0])).not.toContain(
      'email',
    );
    expect(await readSessionFromCookieValue(reissued?.value as string)).toEqual(
      { ...user, accountId: 'account-1', issuedAt: expect.any(Number) },
    );
    expect(
      await reissueLegacySessionCookieValue(reissued?.value as string),
    ).toBeNull();
    expect(
      await reissueLegacySessionCookieValue(
        (await createSessionCookieValue(user, 'account-1')) as string,
      ),
    ).toBeNull();
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
