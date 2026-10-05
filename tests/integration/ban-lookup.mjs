import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createConnection, createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import postgres from 'postgres';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
const sockets = new Set();
const stalledSockets = new Set();
let stallBegin = false;
let stalled = 0;
const proxy = createServer((socket) => {
  sockets.add(socket);
  const upstream = createConnection({
    host: url.hostname,
    port: Number(url.port || 5432),
  });
  let holding = false;
  socket.on('data', (chunk) => {
    if (stallBegin && chunk.includes(Buffer.from('begin '))) {
      holding = true;
      stalled++;
      stalledSockets.add(socket);
    }
    upstream.write(chunk);
  });
  upstream.on('data', (chunk) => {
    if (!holding) socket.write(chunk);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
  socket.on('end', () => socket.destroy());
  socket.on('close', () => {
    sockets.delete(socket);
    stalledSockets.delete(socket);
    upstream.destroy();
  });
});
await new Promise((resolve) => proxy.listen(0, '127.0.0.1', resolve));
const proxyUrl = new URL(url);
proxyUrl.hostname = '127.0.0.1';
proxyUrl.port = String(proxy.address().port);
process.env.DATABASE_URL = proxyUrl.href;
mock.module('server-only', () => ({}));
const { db } = await import('../../src/db/client');
const { ipBans, users } = await import('../../src/db/schema');
const { lookupBan, BAN_STATEMENT_TIMEOUT_MS } = await import(
  '../../src/lib/banLookup'
);
const { eq } = await import('drizzle-orm');
const { POST } = await import('../../src/app/api/internal/ban-check/route');
const { BAN_CHECK_AUTH_HEADER, createBanCheckToken } = await import(
  '../../src/lib/auth-session'
);
process.env.AUTH_SECRET = 'ban-lookup-test-secret';

const discordUserId = randomUUID().replaceAll('-', '');
const locker = postgres(url.href, { max: 1 });
const BLOCKED_IP = '203.0.113.250';
const signal = () => new AbortController().signal;

try {
  await db.insert(users).values({
    discordUserId,
    discordUsername: 'ban-lookup-test',
    displayName: 'Ban Lookup',
    bannedAt: new Date('2026-10-04T00:00:00Z'),
  });
  const found = await lookupBan(null, [discordUserId], signal());
  assert.equal(found?.date.toISOString(), '2026-10-04T00:00:00.000Z');

  await db.insert(ipBans).values({ ip: BLOCKED_IP, reason: 'ban-lookup-test' });
  assert.ok(await lookupBan(BLOCKED_IP, [], signal()));
  const aborted = new AbortController();
  aborted.abort();
  await assert.rejects(lookupBan(BLOCKED_IP, [], aborted.signal));

  const lookups = 8;
  const started = Date.now();
  const outcomes = await locker.begin(async (tx) => {
    await tx`lock table users in access exclusive mode`;
    return Promise.allSettled(
      Array.from({ length: lookups }, () =>
        lookupBan(null, [discordUserId], signal()),
      ),
    );
  });
  const elapsed = Date.now() - started;

  assert.ok(outcomes.every(({ status }) => status === 'rejected'));
  assert.ok(
    elapsed < 2 * (BAN_STATEMENT_TIMEOUT_MS + 1000) + 1000,
    `abandoned lookups took ${elapsed}ms`,
  );

  const [{ active }] = await locker`
    select count(*)::int as active from pg_stat_activity
    where datname = current_database() and pid <> pg_backend_pid()
      and state <> 'idle' and query ilike '%banned_at%'`;
  assert.equal(active, 0);

  const recovered = Date.now();
  assert.ok(await lookupBan(null, [discordUserId], signal()));
  assert.ok(Date.now() - recovered < 1000);

  stallBegin = true;
  const token = await createBanCheckToken();
  const call = () =>
    POST(
      new Request('http://localhost/api/internal/ban-check', {
        method: 'POST',
        headers: { [BAN_CHECK_AUTH_HEADER]: token },
        body: JSON.stringify({ ip: null, discordUserIds: [discordUserId] }),
      }),
    );
  const beforeBegin = Date.now();
  const responses = await Promise.all(Array.from({ length: lookups }, call));
  assert.ok(stalled > 0);
  assert.ok(Date.now() - beforeBegin < 4000);
  for (const response of responses) {
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  const cleanup = Date.now();
  while (stalledSockets.size && Date.now() - cleanup < 1000) await delay(10);
  assert.equal(stalledSockets.size, 0, 'expired BEGIN connections stayed open');
  assert.equal(stalled, lookups);
  const [healthy] = await locker`select 1 as alive`;
  assert.equal(healthy.alive, 1);

  stallBegin = false;
  const retry = Date.now();
  const response = await call();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ban.date, '2026-10-04T00:00:00.000Z');
  assert.ok(Date.now() - retry < 1000);
  console.log('ban lookup recovery passed');
} finally {
  stallBegin = false;
  for (const socket of stalledSockets) socket.destroy();
  if (stalledSockets.size) await delay(50);
  await db.delete(ipBans).where(eq(ipBans.ip, BLOCKED_IP));
  await db.delete(users).where(eq(users.discordUserId, discordUserId));
  await locker.end();
  await db.$client.end({ timeout: 0 });
  for (const socket of sockets) socket.destroy();
  await new Promise((resolve) => proxy.close(resolve));
}
