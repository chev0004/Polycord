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

const origin = process.argv[2];
assert.equal(
  new URL(process.env.SESSION_DATABASE_URL).username,
  'postgres.ftlxjximfprlplbihcph',
);
assert.match(
  origin,
  /^https:\/\/(?:[a-f0-9]+--)?polycord-test006-supabase\.netlify\.app$/,
);
const monitor = postgres(process.env.SESSION_DATABASE_URL, {
  prepare: false,
  max: 1,
  ssl: { ca, rejectUnauthorized: true },
  connect_timeout: 3,
});
const accounts =
  await monitor`select id,discord_user_id from users where discord_user_id in ('test006-allowed','test006-banned')`;
const session = async (id) =>
  `polycord_session=${await createSessionCookieValue({ id, name: 'TEST-006', username: id }, accounts.find((row) => row.discord_user_id === id).id)}`;
const allowed = await session('test006-allowed');
const banned = await session('test006-banned');
const remembered = `polycord_banned=${await createBanCookieValue('test006-remembered')}`;
const token = await createBanCheckToken();
await monitor`insert into ip_bans(ip,reason) select '203.0.113.250','TEST-006 fixture' where not exists(select 1 from ip_bans where ip='203.0.113.250' and revoked_at is null)`;
const results = [];
const checks = [];
const samples = [];
const sample = async () => {
  const [row] =
    await monitor`select count(*)::int as connections,count(*) filter(where state='active')::int as active,count(*) filter(where state='idle in transaction')::int as idle_transactions from pg_stat_activity where datname=current_database() and usename='postgres'`;
  samples.push({ at: new Date().toISOString(), ...row });
};
const call = async (path, options = {}) => {
  const started = performance.now();
  try {
    const response = await fetch(new URL(path, origin), {
      ...options,
      signal: AbortSignal.timeout(12000),
    });
    const body = await response.text();
    return {
      status: response.status,
      bannedScreen: body.includes('id="banned-title"'),
      banFound:
        path === '/api/internal/ban-check' && response.status === 200
          ? JSON.parse(body).ban !== null
          : undefined,
      ms: performance.now() - started,
      noStore:
        response.headers.get('cache-control')?.includes('no-store') ?? false,
      valid: path.startsWith('/api/discovery')
        ? body.includes('"profiles"') || body.includes('"total"')
        : path.startsWith('/en')
          ? body.includes('Polycord')
          : body.includes('"ban"'),
    };
  } catch (error) {
    return { status: 0, error: error.name, ms: performance.now() - started };
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
        (name !== 'banned page' || result.bannedScreen) &&
        (name !== 'IP lookup' || result.banFound),
    });
  }
  await sample();
  const ipResponse = await fetch(new URL('/api/internal/test006-ip', origin), {
    headers: { [BAN_CHECK_AUTH_HEADER]: token },
    signal: AbortSignal.timeout(12000),
  });
  if (ipResponse.status === 200) {
    const { ip } = await ipResponse.json();
    assert.ok(ip);
    const [ban] =
      await monitor`insert into ip_bans(ip,reason) values(${ip},'TEST-006 caller IP test') returning id`;
    try {
      const result = await call('/api/discovery?locale=en');
      checks.push({
        name: 'trusted caller IP ban',
        expected: 403,
        ...result,
        passed: result.status === 403,
      });
      assert.equal(result.status, 403);
    } finally {
      await monitor`delete from ip_bans where id=${ban.id}`;
    }
    assert.equal((await call('/api/discovery?locale=en')).status, 200);
  }
  const sampling = setInterval(() => sample().catch(() => {}), 250);
  const paths = [
    '/en?q=test006',
    '/api/discovery?locale=en',
    '/api/discovery?locale=en&count=1',
    '/api/internal/ban-check',
  ];
  for (const size of [1, 12, 60, 60, 60]) {
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
      size,
      ok: outcomes.filter(({ status, valid }) => status === 200 && valid)
        .length,
      p50: times[Math.floor(size * 0.5)],
      p95: times[Math.min(size - 1, Math.floor(size * 0.95))],
      max: times.at(-1),
      outcomes,
    };
    results.push(result);
    console.log(JSON.stringify({ ...result, outcomes: undefined }));
  }
  clearInterval(sampling);
  await sample();
} finally {
  await monitor.end({ timeout: 0 });
  await writeFile(
    process.argv[3],
    JSON.stringify(
      { at: new Date().toISOString(), origin, checks, results, samples },
      null,
      2,
    ),
  );
}
