import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import { BAN_CHECK_AUTH_HEADER, createBanCheckToken } from '@/lib/auth-session';

let lookup: (ip: string | null, ids: string[]) => Promise<unknown> = async () =>
  null;

mock.module('@/lib/banLookup', () => ({
  lookupBan: (ip: string | null, ids: string[]) => lookup(ip, ids),
}));

const { POST } = await import('./route');

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret';
});

beforeEach(() => {
  lookup = async () => null;
});

const call = async (body: unknown, token?: string | null) => {
  const resolved = token === undefined ? await createBanCheckToken() : token;

  return POST(
    new Request('http://localhost:3000/api/internal/ban-check', {
      method: 'POST',
      headers: resolved ? { [BAN_CHECK_AUTH_HEADER]: resolved } : {},
      body: JSON.stringify(body),
    }),
  );
};

describe('ban check route', () => {
  it('rejects requests without the internal token', async () => {
    const lookups: unknown[] = [];
    lookup = async (...args) => lookups.push(args);

    for (const token of [null, 'forged']) {
      const response = await call({ ip: null, discordUserIds: [] }, token);

      expect(response.status).toBe(403);
    }
    expect(lookups).toEqual([]);
  });

  it('rejects malformed bodies', async () => {
    for (const body of [
      {},
      { ip: null },
      { ip: 4, discordUserIds: [] },
      { ip: null, discordUserIds: [1] },
    ]) {
      expect((await call(body)).status).toBe(400);
    }
  });

  it('returns no ban for an unbanned visitor', async () => {
    const response = await call({ ip: '198.51.100.7', discordUserIds: ['1'] });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ ban: null });
  });

  it('returns the ban for a banned visitor', async () => {
    lookup = async () => ({
      date: new Date('2026-10-04T00:00:00Z'),
      reference: 'PC-TEST-0001',
    });

    const response = await call({ ip: null, discordUserIds: ['1'] });

    expect(await response.json()).toEqual({
      ban: { date: '2026-10-04T00:00:00.000Z', reference: 'PC-TEST-0001' },
    });
  });

  it('answers a failing lookup with a no-store 503', async () => {
    lookup = async () => {
      throw new Error('CONNECT_TIMEOUT');
    };

    const response = await call({ ip: null, discordUserIds: ['1'] });

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
