import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import postgres from 'postgres';
import ca from '../../src/db/supabaseCa.json' with { type: 'json' };
import {
  BAN_CHECK_AUTH_HEADER,
  createBanCheckToken,
  createBanCookieValue,
  createSessionCookieValue,
} from '../../src/lib/auth-session';
import { sandboxOrigin, sandboxResource } from './resources.mjs';

const origin = process.argv[2];
const resource = sandboxResource(process.env.SESSION_DATABASE_URL);
sandboxOrigin(origin, resource, true);
assert.ok(process.env.AUTH_SECRET);
const monitor = postgres(process.env.SESSION_DATABASE_URL, {
  prepare: false,
  max: 1,
  ssl: { ca, rejectUnauthorized: true },
  connect_timeout: 3,
  statement_timeout: 3000,
});
const [fixture] = await monitor`select count(*)::int as profiles,
  count(*) filter(where p.is_public and not p.hidden_by_moderation
    and p.last_bumped_at is not null and u.banned_at is null
    and (u.suspended_until is null or u.suspended_until < now()))::int as discoverable
  from profiles p join users u on u.id=p.user_id`;
assert.equal(fixture.profiles, 5000);
assert.ok(fixture.discoverable > 0);
const accounts =
  await monitor`select id,discord_user_id from users where discord_user_id in ('test006-allowed','test006-banned')`;
const session = async (id) =>
  `polycord_session=${await createSessionCookieValue({ id, name: 'TEST-006', username: id }, accounts.find((row) => row.discord_user_id === id).id)}`;
const allowed = await session('test006-allowed');
const banned = await session('test006-banned');
const remembered = `polycord_banned=${await createBanCookieValue('test006-remembered')}`;
const token = await createBanCheckToken();
assert.equal(
  (
    await monitor`select count(*)::int as total from ip_bans where ip='203.0.113.250' and revoked_at is null`
  )[0].total,
  1,
);
const results = [];
const checks = [];
const samples = [];
let sampling;
const sample = async () => {
  const [row] =
    await monitor`select count(*)::int as connections,count(*) filter(where state='active')::int as active,count(*) filter(where state='idle in transaction')::int as idle_transactions from pg_stat_activity where datname=current_database() and usename='postgres'`;
  samples.push({ at: new Date().toISOString(), ...row });
};
const call = async (path, options = {}) => {
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
          (Array.isArray(data.profiles) &&
            data.profiles.length > 0 &&
            data.profiles.every((profile) => typeof profile.id === 'string')))
      : path.startsWith('/en')
        ? body.includes('\\"feedError\\":false') &&
          body.includes('\\"profiles\\":[{')
        : data !== null && Object.hasOwn(data, 'ban');
    return {
      path,
      startedAt,
      status: response.status,
      bannedScreen: body.includes('id="banned-title"'),
      banFound:
        path === '/api/internal/ban-check' && response.status === 200
          ? data.ban !== null
          : undefined,
      ms: performance.now() - started,
      ttfb,
      bytes: Buffer.byteLength(body),
      serverTiming: response.headers.get('server-timing') ?? '',
      noStore:
        response.headers.get('cache-control')?.includes('no-store') ?? false,
      valid,
    };
  } catch (error) {
    return {
      path,
      startedAt,
      status: 0,
      error: error.name,
      ms: performance.now() - started,
    };
  }
};
try {
  const internal = (body, auth = token) => ({
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      [BAN_CHECK_AUTH_HEADER]: auth,
    },
    body: JSON.stringify(body),
  });
  await sample();
  sampling = setInterval(
    () =>
      sample().catch((error) =>
        samples.push({ at: new Date().toISOString(), error: error.name }),
      ),
    250,
  );
  const paths = [
    '/en',
    '/api/discovery?locale=en',
    '/api/discovery?locale=en&count=1',
    '/api/internal/ban-check',
  ];
  for (const size of [60, 60, 60, 12]) {
    const startedAt = new Date().toISOString();
    const outcomes = await Promise.all(
      Array.from({ length: size }, (_, i) =>
        call(
          paths[i % paths.length],
          i % paths.length === 3
            ? internal({ ip: null, discordUserIds: ['test006-allowed'] })
            : { headers: { cookie: allowed } },
        ),
      ),
    );
    const times = outcomes.map(({ ms }) => ms).sort((a, b) => a - b);
    const result = {
      startedAt,
      firstTraffic: results.length === 0,
      size,
      ok: outcomes.filter(
        ({ status, valid, banFound, noStore }) =>
          status === 200 && valid && !banFound && noStore,
      ).length,
      p50: times[Math.floor(size * 0.5)],
      p95: times[Math.min(size - 1, Math.floor(size * 0.95))],
      max: times.at(-1),
      outcomes,
    };
    results.push(result);
    console.log(JSON.stringify({ ...result, outcomes: undefined }));
  }
  clearInterval(sampling);
  for (const [name, path, options, expected] of [
    ['anonymous page', '/en', {}, 200],
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
      internal({ ip: null, discordUserIds: [] }, 'invalid'),
      403,
    ],
    [
      'IP lookup',
      '/api/internal/ban-check',
      internal({ ip: '203.0.113.250', discordUserIds: [] }),
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
    const result = await call(path, options);
    checks.push({
      name,
      expected,
      ...result,
      passed:
        result.status === expected &&
        result.noStore &&
        (expected !== 200 || name === 'banned page' || result.valid) &&
        (name !== 'banned page' || result.bannedScreen) &&
        (name !== 'IP lookup' || result.banFound),
    });
  }
  await sample();
} finally {
  clearInterval(sampling);
  await monitor.end({ timeout: 0 });
  const evidence = JSON.stringify(
    { at: new Date().toISOString(), origin, fixture, checks, results, samples },
    null,
    2,
  );
  await writeFile(process.argv[3], evidence);
  console.log(`TEST006_RESULT_BEGIN\n${evidence}\nTEST006_RESULT_END`);
}
assert.ok(checks.length === 8 && checks.every(({ passed }) => passed));
assert.ok(results.length === 4 && results.every(({ size, ok }) => ok === size));
assert.ok(samples.every((sample) => !sample.error));
