import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import postgres from 'postgres';
import ca from '../../src/db/supabaseCa.json' with { type: 'json' };
import {
  BAN_CHECK_AUTH_HEADER,
  createBanCheckToken,
  createSessionCookieValue,
} from '../../src/lib/auth-session';

const [origin, mode, output] = process.argv.slice(2);
assert.match(
  origin,
  /^https:\/\/(?:[a-f0-9]+--)?polycord-test006-supabase\.netlify\.app$/,
);
assert.ok(['locked', 'paused', 'recovered'].includes(mode));
assert.equal(
  new URL(process.env.SESSION_DATABASE_URL).username,
  'postgres.ftlxjximfprlplbihcph',
);
const token = await createBanCheckToken();
const cookie = `polycord_session=${await createSessionCookieValue(
  { id: 'test006-allowed', name: 'TEST-006' },
  '00000000-0000-0000-0000-000000000006',
)}`;
const outcomes = [];
const call = async (path) => {
  const started = performance.now();
  const response = await fetch(new URL(path, origin), {
    headers: {
      cookie,
      ...(path.includes('internal') && {
        'content-type': 'application/json',
        [BAN_CHECK_AUTH_HEADER]: token,
      }),
    },
    ...(path.includes('internal') && {
      method: 'POST',
      body: JSON.stringify({ ip: null, discordUserIds: ['test006-allowed'] }),
    }),
    signal: AbortSignal.timeout(12000),
  });
  await response.text();
  const result = {
    path,
    status: response.status,
    ms: performance.now() - started,
    noStore:
      response.headers.get('cache-control')?.includes('no-store') ?? false,
  };
  outcomes.push(result);
  return result;
};
const verify = async (status) => {
  for (const path of [
    '/api/internal/ban-check',
    '/api/discovery?locale=en',
    '/en',
  ]) {
    const result = await call(path);
    assert.equal(result.status, status);
    if (status === 503) {
      assert.ok(result.noStore);
      assert.ok(result.ms < 11000);
    }
  }
};
const client =
  mode === 'locked'
    ? postgres(process.env.SESSION_DATABASE_URL, {
        max: 1,
        prepare: false,
        ssl: { ca, rejectUnauthorized: true },
        connect_timeout: 3,
      })
    : null;
try {
  if (client) {
    await client.begin(async (tx) => {
      await tx`lock table users in access exclusive mode`;
      await verify(503);
    });
    await verify(200);
    const [cleanup] =
      await client`select count(*)::int as idle_transactions from pg_stat_activity where datname=current_database() and usename='postgres' and state='idle in transaction'`;
    assert.equal(cleanup.idle_transactions, 0);
    outcomes.push(cleanup);
  } else {
    await verify(mode === 'paused' ? 503 : 200);
  }
} finally {
  if (client) await client.end({ timeout: 0 });
  await writeFile(
    output,
    JSON.stringify(
      { at: new Date().toISOString(), origin, mode, outcomes },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ mode, outcomes }));
}
