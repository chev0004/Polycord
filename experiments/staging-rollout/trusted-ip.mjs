import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import postgres from 'postgres';
import ca from '../../src/db/supabaseCa.json' with { type: 'json' };
import {
  BAN_CHECK_AUTH_HEADER,
  createBanCheckToken,
} from '../../src/lib/auth-session';

const origin = process.argv[2];
const probeOrigin = process.env.DEV017_IP_ORIGIN ?? origin;
for (const target of [origin, probeOrigin]) {
  assert.match(
    target,
    /^https:\/\/([a-f0-9]{24}--polycord-staging\.netlify\.app|polycord\.chev\.dev)$/,
  );
}
assert.equal(
  new URL(process.env.SESSION_DATABASE_URL).username,
  'postgres.lqyekuxzhxkjsctdpybi',
);
const sql = postgres(process.env.SESSION_DATABASE_URL, {
  prepare: false,
  max: 1,
  ssl: { ca, rejectUnauthorized: true },
  connect_timeout: 3,
  statement_timeout: 3000,
});
const outcomes = [];
let fixture;
try {
  const probe = await fetch(`${probeOrigin}/.netlify/functions/visitor-ip`, {
    headers: { [BAN_CHECK_AUTH_HEADER]: await createBanCheckToken() },
    redirect: 'error',
    signal: AbortSignal.timeout(16000),
  });
  assert.equal(probe.status, 200);
  const { ip } = await probe.json();
  assert.ok(isIP(ip));
  assert.equal(
    (await sql`select id from ip_bans where ip=${ip} and revoked_at is null`)
      .length,
    0,
  );
  [fixture] = await sql`insert into ip_bans (ip,target_discord_user_id,reason)
    values (${ip},'dev017-allowed','DEV-017 fixture') returning id`;
  for (const [path, status, bannedScreen] of [
    ['/api/discovery?locale=en', 403, false],
    ['/en', 200, true],
  ]) {
    const started = performance.now();
    const response = await fetch(`${origin}${path}`, {
      redirect: 'error',
      signal: AbortSignal.timeout(16000),
    });
    const body = await response.text();
    const outcome = {
      path,
      status: response.status,
      ms: performance.now() - started,
      noStore: response.headers.get('cache-control')?.includes('no-store'),
      bannedScreen: body.includes('id="banned-title"'),
    };
    outcomes.push(outcome);
    assert.equal(outcome.status, status);
    assert.equal(outcome.bannedScreen, bannedScreen);
    assert.ok(outcome.noStore);
  }
} finally {
  if (fixture) await sql`delete from ip_bans where id=${fixture.id}`;
  await sql.end({ timeout: 0 });
  await writeFile(process.argv[3], JSON.stringify({ origin, outcomes }, null, 2));
}
const recovery = await fetch(`${origin}/api/discovery?locale=en`, {
  redirect: 'error',
  signal: AbortSignal.timeout(16000),
});
assert.equal(recovery.status, 200);
console.log('DEV-017 trusted IP block and recovery passed');
