import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

let input;
let lookup = async () => null;
mock.module('../../src/lib/banLookup', () => ({
  lookupBan: (ip, ids, signal) => {
    input = { ip, ids, signal };
    return lookup(signal);
  },
}));
process.env.AUTH_SECRET = 'direct-ban-test-secret';
process.env.POLYCORD_DIRECT_BAN_CHECK = 'true';
globalThis.fetch = () => {
  throw new Error('Direct checks must not dispatch HTTPS');
};
const { findBan } = await import('../../src/lib/banGate');
const { default: middleware } = await import('../../src/middleware');
const {
  AUTH_BAN_COOKIE,
  AUTH_SESSION_COOKIE,
  createBanCookieValue,
  createSessionCookieValue,
} = await import('../../src/lib/auth-session');

globalThis.Netlify = { context: { ip: '::ffff:198.51.100.7' } };
const headers = new Headers({
  'x-nf-client-connection-ip': '203.0.113.250',
  'x-forwarded-for': '203.0.113.250',
});
const cookies = new Map([
  [
    AUTH_SESSION_COOKIE,
    await createSessionCookieValue({ id: 'allowed', name: 'Synthetic' }, '1'),
  ],
  [AUTH_BAN_COOKIE, await createBanCookieValue('remembered')],
]);
assert.equal(
  await findBan('https://polycord.test', headers, (name) => cookies.get(name)),
  null,
);
assert.equal(input.ip, '198.51.100.7');
assert.deepEqual(input.ids, ['allowed', 'remembered']);
await findBan('https://polycord.test', headers, () => 'forged');
assert.deepEqual(input.ids, []);

const request = () => new NextRequest('https://polycord.test/api/discovery');
lookup = async () => ({
  date: new Date('2026-10-04T00:00:00Z'),
  reference: 'PC-TEST-0001',
});
const banned = await middleware(request());
assert.equal(banned.status, 403);
assert.equal(banned.headers.get('cache-control'), 'no-store');
lookup = async () => {
  throw new Error('Database unavailable');
};
const failed = await middleware(request());
assert.equal(failed.status, 503);
assert.equal(failed.headers.get('cache-control'), 'no-store');
let aborted = false;
lookup = (signal) =>
  new Promise((_, reject) => {
    signal.addEventListener('abort', () => {
      aborted = true;
      reject(new Error('Cancelled'));
    });
  });
const started = performance.now();
assert.equal((await middleware(request())).status, 503);
assert.ok(performance.now() - started < 4000);
assert.equal(aborted, true);
lookup = async () => null;
assert.equal((await middleware(request())).status, 200);
delete process.env.AUTH_SECRET;
delete process.env.DISCORD_CLIENT_SECRET;
await assert.rejects(
  findBan('https://polycord.test', headers, () => undefined),
  /token unavailable/,
);
console.log('direct ban enforcement and deadline passed');
