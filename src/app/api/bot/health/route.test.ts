import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { GET } from './route';

const call = (authorization?: string) =>
  GET(
    new Request('http://localhost:3000/api/bot/health', {
      headers: authorization ? { authorization } : {},
    }),
  );

describe('bot health route', () => {
  beforeEach(() => {
    process.env.POLYCORD_BOT_KEY = 'bot-test-key';
  });

  afterEach(() => {
    delete process.env.POLYCORD_BOT_KEY;
  });

  it('accepts the bot key', async () => {
    const response = await call('Bearer bot-test-key');

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('rejects a missing or wrong key', async () => {
    for (const authorization of [
      undefined,
      'Bearer wrong',
      'Bearer bot-test-key-extra',
      'Bearer ',
      'bot-test-ke',
    ]) {
      const response = await call(authorization);

      expect(response.status, String(authorization)).toBe(401);
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
  });

  it('rejects every request when no key is configured', async () => {
    delete process.env.POLYCORD_BOT_KEY;

    expect((await call('Bearer bot-test-key')).status).toBe(401);
    expect((await call('Bearer ')).status).toBe(401);
  });
});
