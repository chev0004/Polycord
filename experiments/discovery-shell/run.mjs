import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import postgres from 'postgres';
import ca from '../../src/db/supabaseCa.json' with { type: 'json' };
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

const [origin, output, transport] = process.argv.slice(2);
const resource = sandboxResource(process.env.SESSION_DATABASE_URL);
assert.equal(resource.project, 'vioatoyjsfzqrpohliaa');
sandboxOrigin(origin, resource, true);
assert.ok(['https', 'direct'].includes(transport));
const monitor = postgres(process.env.SESSION_DATABASE_URL, {
  prepare: false,
  max: 1,
  ssl: { ca, rejectUnauthorized: true },
  connect_timeout: 3,
  statement_timeout: 3000,
});
const [fixture] = await monitor`select count(*)::int as profiles,
  count(*) filter(where p.is_public and not p.hidden_by_moderation and p.last_bumped_at is not null and u.banned_at is null and (u.suspended_until is null or u.suspended_until < now()))::int as discoverable
  from profiles p join users u on u.id=p.user_id`;
assert.equal(fixture.profiles, 5000);
assert.equal(fixture.discoverable, 4735);
const accounts =
  await monitor`select id,discord_user_id from users where discord_user_id in ('test006-allowed','test006-banned')`;
const session = (id) =>
  createSessionCookieValue(
    { id, name: 'TEST-006', username: id },
    accounts.find((row) => row.discord_user_id === id).id,
  );
const allowedValue = await session('test006-allowed');
const allowed = `polycord_session=${allowedValue}`;
const banned = `polycord_session=${await session('test006-banned')}`;
const remembered = `polycord_banned=${await createBanCookieValue('test006-remembered')}`;
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
const results = [];
const checks = [];
const samples = [];
let sampling;
const sample = async () => {
  const [row] =
    await monitor`select count(*)::int as connections,count(*) filter(where state='active')::int as active,count(*) filter(where state='idle in transaction')::int as idle_transactions from pg_stat_activity where datname=current_database() and usename='postgres'`;
  samples.push({ at: new Date().toISOString(), ...row });
};
const timings = (response) => ({
  serverTiming: response.headers.get('server-timing') ?? '',
  nodeTiming: response.headers.get('x-disc029-timing') ?? '',
  nodeVersion: response.headers.get('x-disc029-node') ?? '',
  serverless: response.headers.get('x-disc029-serverless') ?? '',
  transport: response.headers.get('x-disc029-transport') ?? '',
  failure: response.headers.get('x-disc029-failure') ?? '',
  code: response.headers.get('x-disc029-code') ?? '',
});
const internal = async (body, invalid = false) => ({
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    [BAN_CHECK_AUTH_HEADER]: invalid ? 'invalid' : await createBanCheckToken(),
  },
  body: JSON.stringify(body),
});
const http = async (path, options = {}) => {
  const started = performance.now();
  const startedAt = new Date().toISOString();
  try {
    const response = await fetch(new URL(path, origin), {
      ...options,
      signal: AbortSignal.timeout(16000),
    });
    const ttfb = performance.now() - started;
    const body = await response.text();
    const data = response.headers
      .get('content-type')
      ?.includes('application/json')
      ? JSON.parse(body)
      : null;
    const valid = path.startsWith('/api/discovery')
      ? data?.total === fixture.discoverable &&
        (path.includes('count=1') ||
          (data?.profiles?.length > 0 &&
            data.profiles.every(({ id }) => typeof id === 'string')))
      : path === '/en'
        ? body.includes('polycord-wordmark.svg') &&
          body.includes('aria-label="Search profiles"')
        : data !== null && Object.hasOwn(data, 'ban');
    return {
      kind: 'http',
      path,
      startedAt,
      status: response.status,
      valid,
      bannedScreen: body.includes('id="banned-title"'),
      banFound:
        path === '/api/internal/ban-check' && response.status === 200
          ? data.ban !== null
          : undefined,
      noStore:
        response.headers.get('cache-control')?.includes('no-store') ?? false,
      ms: performance.now() - started,
      ttfb,
      bytes: Buffer.byteLength(body),
      ...timings(response),
    };
  } catch (error) {
    return {
      kind: 'http',
      path,
      startedAt,
      status: 0,
      valid: false,
      error: error.name,
      ms: performance.now() - started,
    };
  }
};
const observeShell = () => {
  const metrics = { visibleShell: null, dataReady: null };
  Object.assign(window, { disc029Metrics: metrics });
  const visible = (element) =>
    element &&
    element.getBoundingClientRect().width > 0 &&
    element.getBoundingClientRect().height > 0 &&
    getComputedStyle(element).display !== 'none';
  const inspect = () => {
    const search = document.querySelector(
      'main input[aria-label="Search profiles"]',
    );
    const language = document.querySelector(
      'button[aria-label="Change language"]',
    );
    const sort = document.querySelector('button[aria-label="Sort"]');
    const primary = [...document.querySelectorAll('main button')].find(
      (button) => button.textContent.trim() === 'Primary Language',
    );
    const wordmark = document.querySelector('nav img');
    if (
      metrics.visibleShell === null &&
      visible(search) &&
      !search.disabled &&
      visible(language) &&
      visible(sort) &&
      visible(primary) &&
      wordmark?.complete &&
      wordmark.naturalWidth > 0
    )
      metrics.visibleShell = performance.now();
    if (
      metrics.dataReady === null &&
      [...document.querySelectorAll('main article h3')].some(visible)
    )
      metrics.dataReady = performance.now();
  };
  new MutationObserver(inspect).observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
  });
  window.addEventListener('load', inspect);
  document.addEventListener('DOMContentLoaded', inspect);
};
const createPage = async () => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await context.addCookies([
    {
      name: 'polycord_session',
      value: allowedValue,
      url: origin,
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);
  await context.addInitScript(observeShell);
  return { context, page: await context.newPage() };
};
const visit = async ({ context, page }) => {
  const started = performance.now();
  const startedAt = new Date().toISOString();
  const followups = [];
  const pending = [];
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin !== origin || !url.pathname.startsWith('/api/')) return;
    const task = (async () => {
      const headers = response.headers();
      const item = {
        path: url.pathname,
        status: response.status(),
        noStore: headers['cache-control']?.includes('no-store') ?? false,
        serverTiming: headers['server-timing'] ?? '',
        nodeTiming: headers['x-disc029-timing'] ?? '',
        nodeVersion: headers['x-disc029-node'] ?? '',
        serverless: headers['x-disc029-serverless'] ?? '',
        transport: headers['x-disc029-transport'] ?? '',
        failure: headers['x-disc029-failure'] ?? '',
        code: headers['x-disc029-code'] ?? '',
      };
      if (url.pathname === '/api/discovery') {
        const data = await response.json().catch(() => null);
        item.valid =
          response.ok() &&
          data?.total === fixture.discoverable &&
          data?.profiles?.length > 0 &&
          data.profiles.every(({ id }) => typeof id === 'string');
        item.total = data?.total;
      } else if (url.pathname === '/api/discovery/viewer') {
        const data = await response.json().catch(() => null);
        item.valid =
          response.ok() &&
          data?.isLoggedIn === true &&
          data.userId === 'test006-allowed';
      }
      followups.push(item);
    })();
    pending.push(task);
  });
  let result;
  let documentResponse = {};
  try {
    const response = await page.goto(`${origin}/en`, {
      waitUntil: 'commit',
      timeout: 25000,
    });
    const ttfb = performance.now() - started;
    documentResponse = {
      status: response.status(),
      ttfb,
      ...Object.fromEntries(
        Object.entries(response.headers())
          .filter(([key]) =>
            ['server-timing', 'x-disc029-transport'].includes(key),
          )
          .map(([key, value]) => [
            key === 'server-timing' ? 'serverTiming' : 'transport',
            value,
          ]),
      ),
    };
    if (response.status() !== 200) throw new Error('Shell response failed');
    await page.waitForFunction(
      () => typeof window.disc029Metrics?.dataReady === 'number',
      undefined,
      { timeout: 25000 },
    );
    await Promise.all(pending);
    const metrics = await page.evaluate(() => ({
      ...window.disc029Metrics,
      navigation: {
        responseStart:
          performance.getEntriesByType('navigation')[0].responseStart,
        responseEnd: performance.getEntriesByType('navigation')[0].responseEnd,
      },
    }));
    const headers = response.headers();
    result = {
      kind: 'browser',
      path: '/en',
      startedAt,
      status: response.status(),
      valid:
        typeof metrics.visibleShell === 'number' &&
        metrics.visibleShell < metrics.dataReady &&
        followups.some(
          (item) =>
            item.path === '/api/discovery' && item.valid && item.noStore,
        ),
      ms: performance.now() - started,
      ttfb,
      ...metrics,
      serverTiming: headers['server-timing'] ?? '',
      transport: headers['x-disc029-transport'] ?? '',
      followups,
    };
  } catch (error) {
    const metrics = await page
      .evaluate(() => window.disc029Metrics)
      .catch(() => ({}));
    result = {
      kind: 'browser',
      path: '/en',
      startedAt,
      status: documentResponse.status ?? 0,
      valid: false,
      error: error.name,
      errorDetail: error.message.split('\n')[0],
      ms: performance.now() - started,
      ...metrics,
      ...documentResponse,
      followups,
    };
  } finally {
    await context.close();
  }
  return result;
};
const distribution = (items, key) => {
  const values = items
    .map((item) => item[key])
    .filter((value) => typeof value === 'number')
    .sort((a, b) => a - b);
  return {
    count: values.length,
    p50: values[Math.floor(values.length * 0.5)],
    p95: values[Math.min(values.length - 1, Math.floor(values.length * 0.95))],
    max: values.at(-1),
  };
};
try {
  await sample();
  sampling = setInterval(
    () =>
      sample().catch((error) =>
        samples.push({ at: new Date().toISOString(), error: error.name }),
      ),
    250,
  );
  for (const size of [60, 60, 60, 12]) {
    const pages = await Promise.all(
      Array.from({ length: size / 4 }, createPage),
    );
    const options = await internal({
      ip: null,
      discordUserIds: ['test006-allowed'],
    });
    const startedAt = new Date().toISOString();
    const outcomes = await Promise.all(
      Array.from({ length: size }, (_, index) => {
        if (index % 4 === 0) return visit(pages[index / 4]);
        if (index % 4 === 1)
          return http('/api/discovery?locale=en', {
            headers: { cookie: allowed },
          });
        if (index % 4 === 2)
          return http('/api/discovery?locale=en&count=1', {
            headers: { cookie: allowed },
          });
        return http('/api/internal/ban-check', options);
      }),
    );
    const good = (item) =>
      item.status === 200 &&
      item.valid &&
      !item.banFound &&
      (item.kind === 'browser' || item.noStore) &&
      (item.kind === 'browser'
        ? item.serverTiming?.includes('middleware-instance') &&
          item.followups.some(
            (followup) =>
              followup.path === '/api/discovery/viewer' &&
              followup.valid &&
              followup.noStore,
          ) &&
          item.followups.some(
            (followup) =>
              followup.path === '/api/discovery' &&
              followup.nodeTiming.includes('discovery-instance'),
          )
        : item.nodeTiming?.includes('-instance')) &&
      (item.path === '/api/internal/ban-check' || item.transport === transport);
    const result = {
      startedAt,
      firstTraffic: results.length === 0,
      size,
      ok: outcomes.filter(good).length,
      all: distribution(outcomes, 'ms'),
      successful: distribution(outcomes.filter(good), 'ms'),
      shellResponse: distribution(
        outcomes.filter((item) => item.kind === 'browser'),
        'ttfb',
      ),
      visibleShell: distribution(
        outcomes.filter((item) => item.kind === 'browser'),
        'visibleShell',
      ),
      dataReady: distribution(
        outcomes.filter((item) => item.kind === 'browser'),
        'dataReady',
      ),
      outcomes,
    };
    results.push(result);
    console.log(JSON.stringify({ ...result, outcomes: undefined }));
  }
  for (const [name, path, options, expected] of [
    ['anonymous shell', '/en', {}, 200],
    [
      'allowed account',
      '/api/discovery?locale=en',
      { headers: { cookie: allowed } },
      200,
    ],
    ['account ban', '/api/discovery', { headers: { cookie: banned } }, 403],
    ['banned page', '/en', { headers: { cookie: banned } }, 200],
    [
      'remembered ban',
      '/api/discovery',
      { headers: { cookie: remembered } },
      403,
    ],
    [
      'internal authentication',
      '/api/internal/ban-check',
      await internal({ ip: null, discordUserIds: [] }, true),
      403,
    ],
    [
      'IP lookup',
      '/api/internal/ban-check',
      await internal({ ip: '203.0.113.250', discordUserIds: [] }),
      200,
    ],
    [
      'spoofed IP headers',
      '/api/discovery?locale=en',
      {
        headers: {
          'x-nf-client-connection-ip': '203.0.113.250',
          'x-forwarded-for': '203.0.113.250',
        },
      },
      200,
    ],
  ]) {
    const item = await http(path, options);
    checks.push({
      name,
      expected,
      ...item,
      passed:
        (item.status === expected ||
          (name === 'banned page' && item.status === 403)) &&
        (name === 'anonymous shell' || item.noStore) &&
        (expected !== 200 || name === 'banned page' || item.valid) &&
        (name !== 'banned page' || (item.bannedScreen && !item.valid)) &&
        (name !== 'IP lookup' || item.banFound),
    });
  }
  await sample();
} finally {
  clearInterval(sampling);
  await browser.close();
  await monitor.end({ timeout: 0 });
  await writeFile(
    output,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        origin,
        transport,
        fixture,
        versions: { runner: process.version, chromium: browser.version() },
        results,
        checks,
        samples,
      },
      null,
      2,
    ),
  );
}
assert.ok(results.length === 4 && results.every(({ size, ok }) => size === ok));
assert.ok(checks.length === 8 && checks.every(({ passed }) => passed));
assert.ok(samples.every((item) => !item.error));
