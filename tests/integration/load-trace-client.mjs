import assert from 'node:assert/strict';

let bootstrap = null;
let now = 12000;
const frames = [];
const navigation = {
  redirectStart: 100,
  redirectEnd: 3100,
  domainLookupStart: 10,
  connectEnd: 120,
  responseStart: 11000,
  responseEnd: 0,
};
globalThis.window = { location: new URL('https://polycord.test/en') };
globalThis.document = {
  getElementById: () => bootstrap,
  fonts: { ready: Promise.resolve() },
};
globalThis.performance = {
  now: () => now,
  getEntriesByType: () => [navigation],
  getEntriesByName: () => [{ startTime: 11500 }],
};
globalThis.requestAnimationFrame = (callback) => {
  frames.push(callback);
  return frames.length;
};
const {
  startLoadTrace,
  markControlsReady,
  beginGridLoad,
  finishLoadTrace,
  traceDiscoveryRequest,
  refreshNavigationTiming,
  beginPageNavigation,
  commitPageNavigation,
  finishPageLoad,
  recordLoadResource,
  disableLoadTrace,
  cancelPageNavigation,
  beginHistoryNavigation,
} = await import('../../src/features/Discovery/loadTrace');
assert.equal(startLoadTrace(), null);
bootstrap = {
  textContent: JSON.stringify({
    transport: 'https',
    spans: { ban: 4000, gate: 4100 },
  }),
};
assert.equal(startLoadTrace().phases.document.status, 'loading');
assert.equal(startLoadTrace().navigation.download, 0);
navigation.responseEnd = 11080;
refreshNavigationTiming();
assert.equal(startLoadTrace().phases.document.end, 11080);
assert.equal(startLoadTrace().navigation.firstPaint, 11500);
markControlsReady();
assert.equal(startLoadTrace().phases.controls.status, 'loading');
await Promise.resolve();
frames.shift()();
frames.shift()();
assert.equal(startLoadTrace().phases.controls.end, 12000);
assert.equal(startLoadTrace().navigation.redirect, 3000);
finishLoadTrace();
assert.equal(frames.length, 0);
globalThis.fetch = async () => new Response('{}', { status: 503 });
await assert.rejects(
  traceDiscoveryRequest(
    'viewer',
    '/api/discovery/viewer',
    new AbortController().signal,
  ),
);
assert.equal(startLoadTrace().phases.viewer.status, 'failed');
assert.equal(startLoadTrace().phases.viewer.httpStatus, 503);
finishLoadTrace();
assert.equal(frames.length, 0);
const deferred = [];
globalThis.fetch = () => new Promise((resolve) => deferred.push(resolve));
const old = traceDiscoveryRequest(
  'discovery',
  '/api/discovery?old',
  new AbortController().signal,
);
now = 12500;
const latest = traceDiscoveryRequest(
  'discovery',
  '/api/discovery?latest',
  new AbortController().signal,
);
now = 27000;
deferred[1](
  Response.json(
    { total: 0, profiles: [] },
    {
      headers: {
        'Server-Timing': 'pc_handler;dur=3200, pc_query;dur=1100',
        'x-polycord-load-gate': 'pc_gate;dur=450',
      },
    },
  ),
);
await latest;
now = 28000;
deferred[0](Response.json({ total: 10 }));
await old;
assert.equal(startLoadTrace().phases.discovery.start, 12500);
assert.equal(startLoadTrace().phases.discovery.end, 27000);
assert.equal(startLoadTrace().phases.discovery.spans.gate, 450);
assert.equal(startLoadTrace().attempts.length, 3);
assert.equal(startLoadTrace().attempts[0].status, 'failed');
assert.equal(startLoadTrace().attempts[1].end, 28000);
globalThis.fetch = async () => Response.json({ isLoggedIn: true });
await traceDiscoveryRequest(
  'viewer',
  '/api/discovery/viewer',
  new AbortController().signal,
);
beginGridLoad();
finishLoadTrace();
assert.equal(startLoadTrace().finished, undefined);
await Promise.resolve();
frames.shift()();
assert.equal(startLoadTrace().finished, undefined);
now = 29000;
frames.shift()();
assert.equal(startLoadTrace().finished, 29000);
assert.equal(startLoadTrace().phases.grid.status, 'done');
now = 45000;
markControlsReady();
await traceDiscoveryRequest(
  'discovery',
  '/api/discovery?next',
  new AbortController().signal,
);
assert.equal(startLoadTrace().finished, 29000);
assert.equal(startLoadTrace().phases.discovery.end, 27000);
const early = '/api/discovery/bootstrap?&locale=en';
let fetched = 0;
globalThis.fetch = async () => {
  fetched++;
  return Response.json({ viewer: { isLoggedIn: false } });
};
window.__polycordBootstrap = {
  url: early,
  start: 1,
  response: Promise.resolve(Response.json({ viewer: { isLoggedIn: true } })),
};
assert.deepEqual(
  await traceDiscoveryRequest('bootstrap', early, new AbortController().signal),
  { viewer: { isLoggedIn: true } },
);
assert.equal(fetched, 0);
assert.equal(window.__polycordBootstrap, undefined);
for (const [url, response] of [
  [early, Promise.resolve(undefined)],
  ['/api/discovery/bootstrap?&locale=ja', Promise.resolve(Response.json({}))],
]) {
  window.__polycordBootstrap = { url, start: 1, response };
  fetched = 0;
  await traceDiscoveryRequest('bootstrap', early, new AbortController().signal);
  assert.equal(fetched, 1);
}

beginPageNavigation('https://elsewhere.test/settings');
beginPageNavigation('/en#filters');
beginPageNavigation('/en?q=private-search');
assert.equal(startLoadTrace().finished, 29000);
beginPageNavigation('/en/settings');
assert.equal(startLoadTrace().startedAt, 45000);
assert.equal(startLoadTrace().phases.document.status, 'loading');
assert.equal(startLoadTrace().history.length, 1);
now = 45200;
beginPageNavigation('/en/settings');
beginPageNavigation();
assert.equal(startLoadTrace().startedAt, 45000);
recordLoadResource({
  name: 'https://polycord.test/en/settings?_rsc=private',
  initiatorType: 'fetch',
  startTime: 45050,
  responseStart: 45500,
  responseEnd: 45600,
  redirectStart: 45060,
  redirectEnd: 45160,
  serverTiming: [
    { name: 'pc_gate', duration: 200 },
    { name: 'unrelated', duration: 999 },
  ],
});
assert.equal(startLoadTrace().resources[0].name, '/en/settings');
assert.equal(startLoadTrace().resources[0].redirect, 100);
assert.deepEqual(startLoadTrace().resources[0].spans, { gate: 200 });
recordLoadResource({
  name: 'https://polycord.test/previous',
  initiatorType: 'fetch',
  startTime: 44000,
});
assert.equal(startLoadTrace().resources.length, 1);
now = 45700;
commitPageNavigation('/en/settings', { page: 400 });
finishPageLoad();
await Promise.resolve();
frames.shift()();
now = 45800;
frames.shift()();
assert.equal(startLoadTrace().finished, 800);
assert.equal(startLoadTrace().phases.page.status, 'done');
assert.equal(startLoadTrace().phases.page.spans.page, 400);
window.location = new URL('https://polycord.test/en/settings');
refreshNavigationTiming();
assert.equal(startLoadTrace().navigation.firstByte, 0);

now = 46000;
beginPageNavigation('/en/profile');
assert.equal(startLoadTrace().history[1].phases.page.status, 'done');
globalThis.fetch = () => new Promise((resolve) => deferred.push(resolve));
const abandoned = traceDiscoveryRequest(
  'discovery',
  '/api/discovery',
  new AbortController().signal,
);
commitPageNavigation('/en/profile', { page: 500 });
finishPageLoad();
await Promise.resolve();
now = 46200;
beginPageNavigation('/en/saved');
frames.shift()();
frames.shift()();
assert.equal(startLoadTrace().finished, undefined);
deferred.at(-1)(Response.json({ total: 0 }));
await abandoned;
assert.equal(startLoadTrace().phases.discovery.status, 'pending');
assert.equal(startLoadTrace().history.at(-1).phases.page.status, 'cancelled');
assert.equal(startLoadTrace().history.at(-1).attempts[0].status, 'cancelled');
commitPageNavigation('/en/saved', { page: 600 });
finishPageLoad();
await Promise.resolve();
frames.shift()();
now = 47000;
frames.shift()();
assert.equal(startLoadTrace().finished, 800);

beginPageNavigation('/en/user/private-name?token=private');
now = 47500;
commitPageNavigation('/en/u/private-id');
assert.deepEqual(startLoadTrace().routes, [
  '/en/user/[member]',
  '/en/u/[member]',
]);
assert.ok(!JSON.stringify(startLoadTrace()).includes('private'));
finishPageLoad(true);
await Promise.resolve();
frames.shift()();
now = 47600;
frames.shift()();
assert.equal(startLoadTrace().phases.page.status, 'failed');

now = 48000;
beginPageNavigation(undefined, true);
const beforeHistory = startLoadTrace().history.length;
window.location = new URL('https://polycord.test/en/settings');
beginHistoryNavigation();
assert.equal(startLoadTrace().history.length, beforeHistory);
commitPageNavigation('/en/settings');
finishPageLoad();
await Promise.resolve();
frames.shift()();
now = 48100;
frames.shift()();
assert.equal(startLoadTrace().finished, 100);
beginPageNavigation('/en/profile');
cancelPageNavigation();
assert.equal(startLoadTrace().route, '/en/settings');
assert.equal(startLoadTrace().finished, 100);
now = 49000;
beginPageNavigation('/en/inbox');
commitPageNavigation('/en/inbox', { page: 50 });
assert.equal(startLoadTrace().finished, undefined);
now = 50000;
finishPageLoad();
await Promise.resolve();
frames.shift()();
frames.shift()();
assert.equal(startLoadTrace().finished, 1000);

now = 51000;
beginPageNavigation('/en');
commitPageNavigation('/en');
globalThis.fetch = async () => Response.json({});
await traceDiscoveryRequest(
  'viewer',
  '/api/discovery/viewer',
  new AbortController().signal,
);
await traceDiscoveryRequest(
  'discovery',
  '/api/discovery',
  new AbortController().signal,
);
finishLoadTrace();
await Promise.resolve();
frames.shift()();
now = 51500;
frames.shift()();
assert.equal(startLoadTrace().finished, 500);
assert.equal(startLoadTrace().phases.discovery.start, 0);
for (let index = 0; index < 20; index++) {
  now += 100;
  beginPageNavigation(`/en/legal/${index}`);
  commitPageNavigation(`/en/legal/${index}`);
  finishPageLoad();
  await Promise.resolve();
  frames.shift()();
  frames.shift()();
}
assert.equal(startLoadTrace().history.length, 15);
disableLoadTrace();
beginPageNavigation('/en/settings');
assert.equal(startLoadTrace(), null);
console.log('load trace lifecycle passed');
