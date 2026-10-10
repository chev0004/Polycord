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
const cookieHeader = (cookie, dev = 'trace') =>
  [cookie && `polycord_session=${cookie}`, dev && `polycord_dev=${dev}`]
    .filter(Boolean)
    .join('; ');
const request = (cookie, dev) =>
  new Request('https://polycord.test/en', {
    headers: {
      accept: 'text/html',
      cookie: cookieHeader(cookie, dev),
      'x-polycord-load-trace': 'true',
    },
  });
for (const dev of [null, '', 'skeleton'])
  assert.equal(await createLoadTrace(request(ownerCookie, dev)), null);
for (const environment of ['production', 'local', 'staging']) {
  process.env.POLYCORD_ENVIRONMENT = environment;
  process.env.POLYCORD_PUBLIC_URL = 'https://production.test';
  assert.ok(await createLoadTrace(request(ownerCookie)));
  assert.ok(await createLoadTrace(request(ownerCookie, 'skeleton,trace')));
}
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
const rscRequest = request(ownerCookie);
rscRequest.headers.set('rsc', '1');
const rscResponse = await serveDiscoveryDocument(rscRequest, context, {
  en: document,
});
assert.equal(await rscResponse.text(), 'delegated');
assert.match(rscResponse.headers.get('Server-Timing'), /pc_gate;dur=/);
assert.equal(rscResponse.headers.get('cache-control'), 'private, no-store');
const otherResponse = await serveDiscoveryDocument(
  request(otherCookie),
  context,
  { en: document },
);
const otherHtml = await otherResponse.text();
assert.ok(otherHtml.includes('/api/discovery/bootstrap'));
assert.ok(!otherHtml.includes('polycord-load-trace'));
assert.equal(otherResponse.headers.get('Server-Timing'), null);
assert.equal(
  otherResponse.headers.get('cache-control'),
  'public, max-age=0, must-revalidate',
);
assert.ok(
  !(
    await (
      await serveDiscoveryDocument(request(ownerCookie, null), context, {
        en: document,
      })
    ).text()
  ).includes('polycord-load-trace'),
);
const { NextResponse } = await import('next/server');
let pageHeaders = new Headers({ cookie: cookieHeader(ownerCookie) });
mock.module('next/headers', () => ({ headers: async () => pageHeaders }));
mock.module('next/navigation', () => ({ usePathname: () => '/en/settings' }));
mock.module('../../src/db/client', () => ({
  withRequestPool: (run) => run(),
  withRenderPool: (run) => run(),
  scopedRoute: (handler) => handler,
}));
const { tracePage, createPageLoadTrace } = await import(
  '../../src/lib/pageLoadTrace'
);
const props = { params: Promise.resolve({ lang: 'en' }) };
const tracedPage = tracePage('settings', async () => 'Ready settings');
const renderedPage = await tracedPage(props);
assert.equal(renderedPage.props.children[0], 'Ready settings');
assert.equal(renderedPage.props.children[1].props.route, '/en/settings');
assert.ok(renderedPage.props.children[1].props.spans.page >= 0);
assert.equal(
  (await tracePage('inbox', async () => 'Inbox shell')(props)).props.children[1]
    .props.deferred,
  true,
);
for (const cookie of [undefined, 'forged', otherCookie]) {
  pageHeaders = new Headers({ cookie: cookieHeader(cookie) });
  assert.equal(await createPageLoadTrace(), null);
  const untraced = await tracedPage(props);
  assert.equal(untraced.props.children[0], 'Ready settings');
  assert.equal(untraced.props.children[1], null);
}
pageHeaders = new Headers({ cookie: cookieHeader(ownerCookie, null) });
assert.equal((await tracedPage(props)).props.children[1], null);
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const bootstrapJson = JSON.stringify({
  transport: 'https',
  spans: { 'layout-account': 20 },
});
const scriptHtml = renderToStaticMarkup(
  createElement('script', { type: 'application/json' }, bootstrapJson),
);
assert.deepEqual(
  JSON.parse(
    scriptHtml.slice(
      scriptHtml.indexOf('>') + 1,
      scriptHtml.lastIndexOf('</script>'),
    ),
  ),
  JSON.parse(bootstrapJson),
);
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
  assert.equal(
    (await handler(request(ownerCookie, null))).headers.get('Server-Timing'),
    null,
  );
}
const { hasOwnerDevToggle } = await import('../../src/lib/devSettings');
const toggled = (cookie, dev, toggle) =>
  hasOwnerDevToggle(
    (name) =>
      Object.fromEntries(
        cookieHeader(cookie, dev)
          .split('; ')
          .filter(Boolean)
          .map((pair) => pair.split(/=(.*)/s).slice(0, 2)),
      )[name],
    toggle,
  );
assert.equal(await toggled(ownerCookie, 'skeleton', 'skeleton'), true);
assert.equal(await toggled(ownerCookie, 'trace', 'skeleton'), false);
assert.equal(await toggled(ownerCookie, null, 'skeleton'), false);
for (const cookie of [undefined, 'forged', otherCookie])
  assert.equal(await toggled(cookie, 'skeleton,trace', 'skeleton'), false);
console.log('load trace access passed');
