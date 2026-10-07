import { mock } from 'bun:test';
import assert from 'node:assert/strict';

mock.module('server-only', () => ({}));
mock.module('../../src/lib/banLookup', () => ({ lookupBan: async () => null }));
process.env.AUTH_SECRET = 'load-trace-test-secret';
process.env.POLYCORD_ADMIN_USER_IDS = 'owner';
process.env.POLYCORD_DIRECT_BAN_CHECK = 'true';
delete process.env.POLYCORD_PUBLIC_URL;
const { createSessionCookieValue } = await import('../../src/lib/auth-session');
const { createLoadTrace } = await import('../../src/lib/loadTrace');
const { serveDiscoveryDocument } = await import(
  '../../src/lib/discoveryDocument'
);
const ownerCookie = await createSessionCookieValue(
  { id: 'owner', name: 'Owner' },
  'synthetic-owner',
);
const otherCookie = await createSessionCookieValue(
  { id: 'moderator', name: 'Moderator' },
  'synthetic-moderator',
);
const request = (cookie) =>
  new Request('https://polycord.test/en', {
    headers: {
      accept: 'text/html',
      ...(cookie ? { cookie: `polycord_session=${cookie}` } : {}),
      'x-polycord-load-trace': 'true',
    },
  });
process.env.POLYCORD_ENVIRONMENT = 'staging';
delete process.env.POLYCORD_LOAD_TRACE_ENABLED;
assert.equal(await createLoadTrace(request(ownerCookie)), null);
process.env.POLYCORD_LOAD_TRACE_ENABLED = 'true';
process.env.POLYCORD_ENVIRONMENT = 'production';
assert.equal(await createLoadTrace(request(ownerCookie)), null);
process.env.POLYCORD_ENVIRONMENT = 'local';
assert.equal(await createLoadTrace(request(ownerCookie)), null);
process.env.POLYCORD_ENVIRONMENT = 'staging';
process.env.POLYCORD_PUBLIC_URL = 'https://production.test';
assert.equal(await createLoadTrace(request(ownerCookie)), null);
delete process.env.POLYCORD_PUBLIC_URL;
for (const cookie of [undefined, 'forged', otherCookie])
  assert.equal(await createLoadTrace(request(cookie)), null);
const trace = await createLoadTrace(request(ownerCookie));
const originalDate = Date.now;
Date.now = () => originalDate() + 31 * 24 * 60 * 60 * 1000;
try {
  assert.equal(await createLoadTrace(request(ownerCookie)), null);
} finally {
  Date.now = originalDate;
}
const second = await createLoadTrace(request(ownerCookie));
assert.ok(trace && second);
await trace.measure('query', async () => 'complete');
await assert.rejects(
  trace.measure('account', async () => {
    throw new Error('Failed');
  }),
);
assert.ok(trace.spans.query >= 0 && trace.spans.account >= 0);
assert.deepEqual(second.spans, {});
assert.match(trace.headers('handler')['Server-Timing'], /pc_query;dur=/);
const document = '<html><head></head><body>Public shell</body></html>';
const context = { next: async () => new Response('delegated') };
const ownerResponse = await serveDiscoveryDocument(
  request(ownerCookie),
  context,
  { en: document },
);
assert.equal(ownerResponse.headers.get('cache-control'), 'private, no-store');
assert.match(ownerResponse.headers.get('Server-Timing'), /pc_gate;dur=/);
const html = await ownerResponse.text();
assert.ok(html.includes('id="polycord-load-trace"'));
assert.ok(!html.includes(ownerCookie) && !html.includes('synthetic-owner'));
const otherResponse = await serveDiscoveryDocument(
  request(otherCookie),
  context,
  { en: document },
);
assert.equal(await otherResponse.text(), document);
assert.equal(otherResponse.headers.get('Server-Timing'), null);
assert.equal(
  otherResponse.headers.get('cache-control'),
  'public, max-age=0, must-revalidate',
);
process.env.POLYCORD_ENVIRONMENT = 'production';
assert.equal(
  await (
    await serveDiscoveryDocument(request(ownerCookie), context, {
      en: document,
    })
  ).text(),
  document,
);
const { NextResponse } = await import('next/server');
mock.module('next/server', () => ({ NextResponse, after: () => {} }));
const ownerIdentity = {
  account: {
    currentUser: { id: 'owner', accountId: 'synthetic-owner' },
  },
  restriction: null,
};
mock.module('../../src/lib/auth', () => ({
  getCurrentUser: async () => ownerIdentity.account.currentUser,
  getSessionIdentity: async () => ownerIdentity,
  isBannedIdentity: async () => false,
}));
mock.module('../../src/db/client', () => ({
  withRequestPool: (run) => run(),
}));
mock.module('../../src/db/ipBans', () => ({
  findActiveIpBan: async () => null,
}));
mock.module('../../src/lib/moderation', () => ({
  withModerationStates: async (profiles) => profiles,
}));
mock.module('../../src/lib/analytics/track.server', () => ({
  trackEvent: async () => {},
}));
mock.module('../../src/db', () => ({
  getProfileByUserId: async () => null,
  getUserSettingsByUserId: async () => null,
  countPendingCases: async () => 0,
  hasStaffRole: async () => false,
  mapProfileToDiscoveryProfile: () => null,
  toViewerAvailabilityContext: () => ({}),
}));
mock.module('../../src/db/discovery', () => ({
  countDiscovery: async () => 0,
  listDiscoveryPage: async () => ({
    profiles: [],
    total: 0,
    page: 1,
    tags: [],
    savedProfileIds: [],
  }),
}));
const { GET: bootstrap } = await import(
  '../../src/app/api/discovery/bootstrap/route'
);
const { GET: discovery } = await import('../../src/app/api/discovery/route');
process.env.POLYCORD_ENVIRONMENT = 'staging';
for (const handler of [bootstrap, discovery]) {
  const response = await handler(request(ownerCookie));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Server-Timing'), /pc_handler;dur=/);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  for (const cookie of [undefined, 'forged', otherCookie]) {
    assert.equal(
      (await handler(request(cookie))).headers.get('Server-Timing'),
      null,
    );
  }
  process.env.POLYCORD_ENVIRONMENT = 'production';
  assert.equal(
    (await handler(request(ownerCookie))).headers.get('Server-Timing'),
    null,
  );
  process.env.POLYCORD_ENVIRONMENT = 'staging';
}
console.log('load trace access passed');
