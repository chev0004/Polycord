import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { NextRequest } from 'next/server';

process.env.DATABASE_URL = 'postgres://test@localhost/test';
process.env.AUTH_SECRET = 'gated-route-test-secret';
process.env.POLYCORD_DIRECT_BAN_CHECK = 'true';
mock.module('server-only', () => ({}));

const events = [];
let ipBanned = false;
let cookieBanned = false;
let identity = null;
let failure = null;
const ipBans = await import('../../src/db/ipBans');
mock.module('../../src/db/ipBans', () => ({
  ...ipBans,
  findActiveIpBan: async (ip) => {
    events.push(`ip:${ip}`);
    if (failure) throw failure;
    return ipBanned ? { id: 'ban' } : null;
  },
}));
const auth = await import('../../src/lib/auth');
mock.module('../../src/lib/auth', () => ({
  ...auth,
  isBannedIdentity: async (id) => {
    events.push(`cookie:${id}`);
    return cookieBanned;
  },
  getSessionIdentity: async () => {
    events.push('session');
    return identity;
  },
}));
let lookups = 0;
mock.module('../../src/lib/banLookup', () => ({
  lookupBan: async () => {
    lookups++;
    return null;
  },
}));

const { AUTH_BAN_COOKIE, createBanCookieValue } = await import(
  '../../src/lib/auth-session'
);
const { GET: voice } = await import(
  '../../src/app/api/voice/[profileId]/route'
);
const { GET: voices } = await import('../../src/app/api/voice/route');
const { GET: adminCase } = await import('../../src/app/api/admin/case/route');
const { GET: bootstrap } = await import(
  '../../src/app/api/discovery/bootstrap/route'
);
const { default: middleware } = await import('../../src/middleware');

const banCookie = `${AUTH_BAN_COOKIE}=${await createBanCookieValue('remembered')}`;
const request = (path, cookie) =>
  new NextRequest(`https://polycord.test${path}`, {
    headers: {
      'x-nf-client-connection-ip': '203.0.113.9',
      ...(cookie ? { cookie } : {}),
    },
  });
const routes = [
  [
    '/api/voice/profile',
    (r) => voice(r, { params: Promise.resolve({ profileId: 'profile' }) }),
  ],
  ['/api/voice?ids=profile', voices],
  ['/api/admin/case?profileId=profile', adminCase],
  ['/api/discovery/bootstrap', bootstrap],
];

for (const [path, handler] of routes) {
  for (const [name, state, cookie] of [
    ['IP', { ipBanned: true }],
    ['remembered cookie', { cookieBanned: true }, banCookie],
    ['account', { identity: { account: null, restriction: 'banned' } }],
  ]) {
    ({ ipBanned = false, cookieBanned = false, identity = null } = state);
    events.length = 0;
    const response = await handler(request(path, cookie));
    assert.equal(response.status, 403, `${path} ${name}`);
    assert.deepEqual(await response.json(), { error: 'Forbidden' });
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.ok(events.includes('session'), `${path} ${name} session`);
    assert.ok(events.some((event) => event.startsWith('ip:')));
  }

  ipBanned = false;
  cookieBanned = false;
  identity = null;
  failure = new Error('Database unavailable');
  const unavailable = await handler(request(path));
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get('retry-after'), '5');
  failure = null;
}

ipBanned = false;
identity = null;
const notFound = await adminCase(request('/api/admin/case?profileId=profile'));
assert.equal(notFound.status, 404);

const skipped = [];
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(join(dir, entry.name))
      : entry.name === 'route.ts'
        ? [join(dir, entry.name)]
        : [],
  );
const apiRoot = join(process.cwd(), 'src/app/api');
for (const file of walk(apiRoot)) {
  const path =
    `/api/${relative(apiRoot, join(file, '..')).split(sep).join('/')}`.replace(
      /\[[^\]]+\]/g,
      'segment',
    );
  const before = lookups;
  await middleware(request(path));
  if (lookups !== before) continue;
  skipped.push(path);
  if (
    ['/api/billing/webhook', '/api/health', '/api/internal/ban-check'].includes(
      path,
    )
  )
    continue;
  assert.match(
    readFileSync(file, 'utf8'),
    /\bgatedRoute\(/,
    `${path} skips the middleware ban gate without the shared wrapper`,
  );
}
assert.ok(skipped.includes('/api/voice'));
assert.ok(skipped.includes('/api/voice/segment'));
assert.ok(skipped.includes('/api/admin/case'));
assert.ok(skipped.includes('/api/discovery/bootstrap'));
console.log('gated route enforcement passed');
