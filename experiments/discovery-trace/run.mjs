import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import {
  BAN_CHECK_AUTH_HEADER,
  createBanCheckToken,
  createBanCookieValue,
  createSessionCookieValue,
} from '../../src/lib/auth-session';
import {
  sandboxOrigin,
  sandboxResource,
} from '../database-burst/resources.mjs';

const [
  origin,
  output,
  transport,
  control = 'real',
  workload = 'single',
  firstPath = '/en',
] = process.argv.slice(2);
const resource = sandboxResource(process.env.DATABASE_URL);
assert.equal(resource.project, 'vioatoyjsfzqrpohliaa');
sandboxOrigin(origin, resource, true);
assert.ok(['https', 'direct'].includes(transport));
assert.ok(['real', 'fixed', 'select1'].includes(control));
const token = await createBanCheckToken();
const session = await createSessionCookieValue(
  { id: 'test006-allowed', name: 'TEST-006', username: 'test006-allowed' },
  process.env.DISC031_ACCOUNT_ID,
);
const banned = await createSessionCookieValue(
  { id: 'test006-banned', name: 'TEST-006' },
  '00000000-0000-0000-0000-000000000007',
);
const remembered = await createBanCookieValue('test006-remembered');
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
const outcomes = [];
const checks = [];
const observe = () => {
  const metrics = { visible: null, usable: null, cards: null, fetches: [] };
  window.disc031 = metrics;
  const responses = new WeakMap();
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const url = new URL(
      typeof args[0] === 'string' ? args[0] : args[0].url,
      location.href,
    );
    const item = { path: url.pathname, dispatch: performance.now() };
    if (url.origin === location.origin) metrics.fetches.push(item);
    try {
      const response = await originalFetch(...args);
      item.headers = performance.now();
      item.status = response.status;
      responses.set(response, item);
      return response;
    } catch (error) {
      item.error = error.name;
      item.end = performance.now();
      throw error;
    }
  };
  const originalJson = Response.prototype.json;
  Response.prototype.json = async function () {
    const item = responses.get(this);
    if (item) item.jsonStart = performance.now();
    try {
      return await originalJson.call(this);
    } finally {
      if (item) item.jsonEnd = performance.now();
    }
  };
  const visible = (el) =>
    el &&
    el.getBoundingClientRect().width > 0 &&
    el.getBoundingClientRect().height > 0 &&
    getComputedStyle(el).display !== 'none';
  const interactive = (el, event) => {
    const key =
      el && Object.keys(el).find((key) => key.startsWith('__reactProps$'));
    return key && typeof el[key]?.[event] === 'function';
  };
  const inspect = () => {
    const search = document.querySelector(
      'main input[type="search"], main input[aria-label]',
    );
    const controls = [...document.querySelectorAll('main button')].filter(
      visible,
    );
    const language = document.querySelector(
      'nav button[aria-haspopup="dialog"]',
    );
    const wordmark = document.querySelector('nav img');
    if (
      visible(search) &&
      controls.length >= 5 &&
      wordmark?.complete &&
      wordmark.naturalWidth > 0
    ) {
      metrics.visible ??= performance.now();
      if (
        interactive(search, 'onChange') &&
        controls.filter((el) => interactive(el, 'onClick')).length >= 5 &&
        interactive(language, 'onClick')
      )
        metrics.usable ??= performance.now();
    }
    if ([...document.querySelectorAll('main article h3')].some(visible))
      metrics.cards ??= performance.now();
  };
  new MutationObserver(inspect).observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
  });
  const timer = setInterval(() => {
    inspect();
    if (metrics.usable !== null && metrics.cards !== null) clearInterval(timer);
  }, 25);
};
const parseHeaders = (headers) =>
  Object.fromEntries(
    [
      'x-disc031',
      'x-disc031-edge',
      'x-disc031-runtime',
      'cache-control',
      'content-type',
    ]
      .filter((key) => headers[key])
      .map((key) => [key, headers[key]]),
  );
const createPage = async (signed) => {
  const id = randomUUID();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await context.route(`${origin}/**`, async (route) =>
    route.continue({
      headers: {
        ...route.request().headers(),
        [BAN_CHECK_AUTH_HEADER]: token,
        'x-disc031-control': control,
        'x-disc031-id': id,
      },
    }),
  );
  if (signed)
    await context.addCookies([
      {
        name: 'polycord_session',
        value: session,
        url: origin,
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      },
    ]);
  await context.addInitScript(observe);
  return { id, context, page: await context.newPage(), signed };
};
const visit = async (prepared, path, phase) => {
  const { id, context, page, signed } = prepared;
  const started = performance.now();
  const startedAt = new Date().toISOString();
  const requests = [];
  const pending = [];
  const requestRecords = new WeakMap();
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin) return;
    const item = {
      path: url.pathname,
      type: request.resourceType(),
      dispatch: performance.now() - started,
    };
    requests.push(item);
    requestRecords.set(request, item);
  });
  page.on('response', (response) => {
    const item = requestRecords.get(response.request());
    if (!item) return;
    item.headersAt = performance.now() - started;
    item.status = response.status();
    item.headers = parseHeaders(response.headers());
    pending.push(
      (async () => {
        await response.finished().catch((error) => {
          item.endError = error.name;
        });
        item.end = performance.now() - started;
        item.network = response.request().timing();
        if (item.path.startsWith('/api/discovery')) {
          const data = await response.json().catch(() => null);
          item.valid = item.path.endsWith('/viewer')
            ? data?.isLoggedIn === signed
            : data?.total === 4735 &&
              (data.profiles?.length > 0 || response.url().includes('count=1'));
        }
      })(),
    );
  });
  let result;
  try {
    const response = await page.goto(origin + path, {
      waitUntil: 'commit',
      timeout: 35000,
    });
    await page.waitForFunction(
      () => window.disc031?.cards !== null && window.disc031?.usable !== null,
      undefined,
      { timeout: 30000 },
    );
    await Promise.all(pending);
    const metrics = await page.evaluate(() => ({
      ...window.disc031,
      navigation: performance
        .getEntriesByType('navigation')
        .map((e) => e.toJSON()),
      paints: performance
        .getEntriesByType('paint')
        .map((e) => ({ name: e.name, start: e.startTime })),
      resources: performance
        .getEntriesByType('resource')
        .filter((e) => new URL(e.name).origin === location.origin)
        .map((e) => ({
          path: new URL(e.name).pathname,
          start: e.startTime,
          fetch: e.fetchStart,
          request: e.requestStart,
          headers: e.responseStart,
          end: e.responseEnd,
          dns: e.domainLookupEnd - e.domainLookupStart,
          connect: e.connectEnd - e.connectStart,
          tls: e.secureConnectionStart
            ? e.connectEnd - e.secureConnectionStart
            : 0,
          encoded: e.encodedBodySize,
          decoded: e.decodedBodySize,
        })),
      longTasks: window.disc031LongTasks ?? [],
    }));
    for (const nav of metrics.navigation) {
      delete nav.name;
      delete nav.serverTiming;
    }
    result = {
      id,
      phase,
      path,
      signed,
      startedAt,
      status: response.status(),
      valid:
        response.ok() &&
        requests
          .filter((r) => r.path.startsWith('/api/discovery'))
          .every((r) => r.valid),
      ms: performance.now() - started,
      ...metrics,
      requests,
    };
  } catch (error) {
    result = {
      id,
      phase,
      path,
      signed,
      startedAt,
      valid: false,
      error: error.name,
      ms: performance.now() - started,
      requests,
      metrics: await page.evaluate(() => window.disc031).catch(() => null),
    };
  } finally {
    await context.close();
  }
  outcomes.push(result);
  return result;
};
const http = async (path, phase, options = {}) => {
  const id = randomUUID();
  const started = performance.now();
  const item = {
    id,
    phase,
    path: path.split('?')[0],
    startedAt: new Date().toISOString(),
  };
  try {
    const response = await fetch(origin + path, {
      ...options,
      headers: {
        [BAN_CHECK_AUTH_HEADER]: token,
        'x-disc031-id': id,
        'x-disc031-control': control,
        ...options.headers,
      },
      signal: AbortSignal.timeout(35000),
      redirect: 'manual',
    });
    item.headersAt = performance.now() - started;
    const text = await response.text();
    item.ms = performance.now() - started;
    item.status = response.status;
    item.headers = parseHeaders(Object.fromEntries(response.headers));
    item.bytes = Buffer.byteLength(text);
    item.bannedScreen = text.includes('id="banned-title"');
    const data = response.headers
      .get('content-type')
      ?.includes('application/json')
      ? JSON.parse(text)
      : null;
    item.valid =
      data?.total === 4735 || data?.ban === null || data?.ok === true;
    item.banFound = Boolean(data?.ban);
  } catch (error) {
    item.error = error.name;
    item.errorCode = error.cause?.code;
    item.errorFrames = error.stack?.split('\n').slice(1, 3);
    item.ms = performance.now() - started;
    item.valid = false;
  }
  outcomes.push(item);
  return item;
};
try {
  if (workload === 'minimal' || workload === 'handler') {
    for (const phase of ['cold', 'warm-1', 'warm-2'])
      await http(
        workload === 'minimal'
          ? '/api/internal/disc031-minimal'
          : '/api/discovery?locale=en',
        phase,
      );
  } else if (workload === 'single') {
    const cold = await createPage(false);
    await visit(cold, firstPath, 'cold');
    for (const phase of ['warm-1', 'warm-2'])
      for (const path of ['/', '/en', '/ja'])
        for (const signed of [false, true])
          await visit(await createPage(signed), path, phase);
    for (const signed of [false, true])
      await http('/api/discovery?locale=en&count=1', 'warm-count', {
        headers: signed ? { cookie: `polycord_session=${session}` } : {},
      });
  } else if (workload === 'idle') {
    for (const path of ['/', '/en', '/ja'])
      for (const signed of [false, true])
        await visit(await createPage(signed), path, 'idle');
  } else {
    assert.equal(workload, 'burst');
    for (const phase of ['cold', 'warm-1', 'warm-2']) {
      const pages = await Promise.all(
        Array.from({ length: 15 }, (_, i) => createPage(i % 2 === 0)),
      );
      await Promise.all(
        Array.from({ length: 60 }, (_, i) => {
          if (i % 4 === 0)
            return visit(pages[i / 4], ['/', '/en', '/ja'][(i / 4) % 3], phase);
          if (i % 4 === 1)
            return http('/api/discovery?locale=en', phase, {
              headers: { cookie: `polycord_session=${session}` },
            });
          if (i % 4 === 2)
            return http('/api/discovery?locale=en&count=1', phase, {
              headers: { cookie: `polycord_session=${session}` },
            });
          return http('/api/internal/ban-check', phase, {
            method: 'POST',
            body: JSON.stringify({
              ip: null,
              discordUserIds: ['test006-allowed'],
            }),
            headers: { 'content-type': 'application/json' },
          });
        }),
      );
    }
  }
  if (workload !== 'minimal' && workload !== 'handler' && workload !== 'idle')
    for (const [name, path, options, status] of [
      [
        'account',
        '/api/discovery',
        { headers: { cookie: `polycord_session=${banned}` } },
        403,
      ],
      [
        'remembered',
        '/api/discovery',
        { headers: { cookie: `polycord_banned=${remembered}` } },
        403,
      ],
      [
        'document ban',
        '/en',
        {
          headers: {
            cookie: `polycord_session=${banned}`,
            accept: 'text/html',
          },
        },
        403,
      ],
      [
        'internal authentication',
        '/api/internal/ban-check',
        {
          method: 'POST',
          headers: {
            [BAN_CHECK_AUTH_HEADER]: 'invalid',
            'content-type': 'application/json',
          },
          body: '{"ip":null,"discordUserIds":[]}',
        },
        403,
      ],
      [
        'unsigned cookie',
        '/api/discovery?locale=en',
        {
          headers: {
            cookie: 'polycord_session=forged',
            'x-disc031-control': 'real',
          },
        },
        200,
      ],
      [
        'spoofed headers',
        '/api/discovery?locale=en',
        {
          headers: {
            'x-nf-client-connection-ip': '203.0.113.250',
            'x-forwarded-for': '203.0.113.250',
            'x-disc031-control': 'real',
          },
        },
        200,
      ],
      [
        'fixed authentication',
        '/api/discovery',
        {
          headers: {
            [BAN_CHECK_AUTH_HEADER]: 'invalid',
            'x-disc031-control': 'fixed',
          },
        },
        403,
      ],
    ]) {
      const item = await http(path, 'safety', options);
      checks.push({
        name,
        passed:
          item.status === status &&
          item.headers?.['cache-control']?.includes('no-store') &&
          (name !== 'document ban' || item.bannedScreen),
        id: item.id,
      });
    }
} finally {
  await browser.close();
  await writeFile(
    output,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        origin,
        transport,
        control,
        workload,
        firstPath,
        fixture: { profiles: 5000, discoverable: 4735 },
        versions: { node: process.version, chromium: browser.version() },
        outcomes,
        checks,
      },
      null,
      2,
    ),
  );
}
console.log(
  JSON.stringify({
    output,
    observations: outcomes.length,
    invalid: outcomes.filter(
      (o) => o.phase !== 'safety' && (!o.valid || o.status !== 200),
    ).length,
    checks: checks.length,
    failedChecks: checks.filter((c) => !c.passed).length,
    cold: outcomes
      .filter((o) => o.phase === 'cold')
      .map((o) => ({
        path: o.path,
        usable: o.usable,
        cards: o.cards,
        ms: o.ms,
        valid: o.valid,
      })),
  }),
);
assert.ok(
  outcomes
    .filter((o) => o.phase !== 'safety')
    .every((o) => o.valid && o.status === 200),
);
assert.ok(checks.every((c) => c.passed));
