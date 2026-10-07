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
globalThis.document = { getElementById: () => bootstrap };
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
console.log('load trace lifecycle passed');
