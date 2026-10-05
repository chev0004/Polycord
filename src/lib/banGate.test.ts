import { afterEach, beforeAll, describe, expect, it } from 'bun:test';
import {
  AUTH_BAN_COOKIE,
  BAN_CHECK_AUTH_HEADER,
  createBanCookieValue,
} from './auth-session';
import { findBan } from './banGate';

const realFetch = globalThis.fetch;
let calls: Request[] = [];

const stubFetch = (respond: () => Response | Promise<Response>) => {
  globalThis.fetch = (async (input: URL, init: RequestInit) => {
    calls.push(new Request(input, init));
    return respond();
  }) as unknown as typeof fetch;
};

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret';
});

afterEach(() => {
  globalThis.fetch = realFetch;
  calls = [];
});

const headers = new Headers({ 'x-nf-client-connection-ip': '198.51.100.7' });

describe('findBan', () => {
  it('posts the ip and verified identities with the internal token', async () => {
    stubFetch(() => Response.json({ ban: null }));
    const banCookie = await createBanCookieValue('42');

    const ban = await findBan('https://polycord.test', headers, (name) =>
      name === AUTH_BAN_COOKIE ? (banCookie ?? undefined) : undefined,
    );

    expect(ban).toBeNull();
    expect(calls[0].url).toBe('https://polycord.test/api/internal/ban-check');
    expect(calls[0].headers.get(BAN_CHECK_AUTH_HEADER)).toBeTruthy();
    expect(await calls[0].json()).toEqual({
      ip: '198.51.100.7',
      discordUserIds: ['42'],
    });
  });

  it('returns the ban with a parsed date', async () => {
    stubFetch(() =>
      Response.json({
        ban: { date: '2026-10-04T00:00:00.000Z', reference: 'PC-TEST-0001' },
      }),
    );

    const ban = await findBan(
      'https://polycord.test',
      headers,
      () => undefined,
    );

    expect(ban).toEqual({
      date: new Date('2026-10-04T00:00:00.000Z'),
      reference: 'PC-TEST-0001',
    });
  });

  it('rejects when the endpoint answers with an error status', async () => {
    stubFetch(() => new Response(null, { status: 503 }));

    await expect(
      findBan('https://polycord.test', headers, () => undefined),
    ).rejects.toThrow();
  });

  it('rejects malformed results', async () => {
    for (const body of [
      {},
      { ban: 'yes' },
      { ban: { date: 'x', reference: 1 } },
    ]) {
      stubFetch(() => Response.json(body));

      await expect(
        findBan('https://polycord.test', headers, () => undefined),
      ).rejects.toThrow();
    }
  });

  it('rejects when the request fails', async () => {
    stubFetch(() => Promise.reject(new Error('network')));

    await expect(
      findBan('https://polycord.test', headers, () => undefined),
    ).rejects.toThrow();
  });
});
