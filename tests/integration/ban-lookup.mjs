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
let stallQuery = false;
let stallTransaction = null;
let disconnectTransaction = null;
let stalled = 0;
const proxy = createServer((socket) => {
  sockets.add(socket);
  const upstream = createConnection({
    host: url.hostname,
    port: Number(url.port || 5432),
  });
  let holding = false;
  socket.on('data', (chunk) => {
    if (
      disconnectTransaction &&
      chunk.includes(Buffer.from(disconnectTransaction))
    ) {
      socket.destroy();
      return;
    }
    if (
      (stallBegin && chunk.includes(Buffer.from('begin'))) ||
      (stallQuery && chunk.includes(Buffer.from('banned_at'))) ||
      (stallTransaction && chunk.includes(Buffer.from(stallTransaction)))
    ) {
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
const { db, createBanClient } = await import('../../src/db/client');
for (const sslmode of ['require', 'disable', 'no-verify']) {
  process.env.DATABASE_URL = `postgresql://postgres.test006@aws-0-us-east-2.pooler.supabase.com:6543/postgres?sslmode=${sslmode}`;
  const client = createBanClient(new AbortController().signal);
  assert.equal(client.connectionParameters.ssl.rejectUnauthorized, true);
  assert.ok(client.connectionParameters.ssl.ca.includes('BEGIN CERTIFICATE'));
  await client.end();
}
process.env.DATABASE_URL = proxyUrl.href;
const { ipBans, users } = await import('../../src/db/schema');
const { lookupBan, BAN_STATEMENT_TIMEOUT_MS } = await import(
  '../../src/lib/banLookup'
);
const { eq, sql, TransactionRollbackError } = await import('drizzle-orm');
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

  stallQuery = true;
  const queryStarted = Date.now();
  const stalledQuery = await call();
  assert.equal(stalledQuery.status, 503);
  assert.equal(stalledQuery.headers.get('cache-control'), 'no-store');
  assert.ok(Date.now() - queryStarted < 4000);
  stallQuery = false;
  await delay(100);
  assert.equal(stalledSockets.size, 0);
  assert.equal((await call()).status, 200);

  const reachableUrl = process.env.DATABASE_URL;
  const unreachableUrl = new URL(reachableUrl);
  unreachableUrl.port = '1';
  process.env.DATABASE_URL = unreachableUrl.href;
  const unavailableStarted = Date.now();
  const unavailable = await call();
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get('cache-control'), 'no-store');
  assert.ok(Date.now() - unavailableStarted < 4000);
  process.env.DATABASE_URL = reachableUrl;
  assert.equal((await call()).status, 200);

  for (const statement of ['begin', 'select 42 as disconnected', 'commit']) {
    disconnectTransaction = statement;
    const started = Date.now();
    const outcomes = await Promise.allSettled(
      Array.from({ length: 2 }, () =>
        db.transaction((tx) => tx.execute(sql`select 42 as disconnected`)),
      ),
    );
    assert.ok(
      outcomes.every(
        (outcome) =>
          outcome.status === 'rejected' &&
          outcome.reason.cause?.message ===
            'Connection terminated unexpectedly',
      ),
    );
    assert.ok(Date.now() - started < 1000);
    assert.equal(db.$client.totalCount, 0);
    assert.equal(db.$client.waitingCount, 0);
    disconnectTransaction = null;
    assert.equal(
      (await db.transaction((tx) => tx.execute(sql`select 1 as recovered`)))
        .rows[0].recovered,
      1,
    );
    const client = await db.$client.connect();
    assert.equal(client.listenerCount('error'), 0);
    client.release();
  }

  stallBegin = true;
  const transactionStarted = Date.now();
  const transactions = await Promise.allSettled(
    Array.from({ length: 4 }, () =>
      db.transaction((tx) => tx.execute(sql`select 1`)),
    ),
  );
  assert.ok(transactions.every(({ status }) => status === 'rejected'));
  assert.ok(Date.now() - transactionStarted < 12000);
  assert.equal(db.$client.waitingCount, 0);
  await delay(100);
  assert.equal(stalledSockets.size, 0);
  stallBegin = false;
  for (const statement of ['select 42 as stalled', 'commit']) {
    stallTransaction = statement;
    const started = Date.now();
    await assert.rejects(
      db.transaction((tx) => tx.execute(sql`select 42 as stalled`)),
      (error) => error.cause?.message === 'Query read timeout',
    );
    assert.ok(
      Date.now() - started < 12000,
      `${statement} cleanup exceeded its deadline`,
    );
    await delay(100);
    assert.equal(stalledSockets.size, 0);
    assert.equal(db.$client.waitingCount, 0);
    stallTransaction = null;
    assert.equal(
      (await db.execute(sql`select 1 as recovered`)).rows[0].recovered,
      1,
    );
  }
  assert.equal(
    (await db.transaction((tx) => tx.execute(sql`select 1 as recovered`)))
      .rows[0].recovered,
    1,
  );
  const rollbackId = `rollback-${discordUserId.slice(0, 23)}`;
  const rollbackError = new Error('TEST-006 rollback');
  await assert.rejects(
    db.transaction(async (tx) => {
      await tx.insert(users).values({
        discordUserId: rollbackId,
        discordUsername: rollbackId,
        displayName: 'Rollback fixture',
      });
      throw rollbackError;
    }),
    (error) => error === rollbackError,
  );
  assert.equal(
    (await db.select().from(users).where(eq(users.discordUserId, rollbackId)))
      .length,
    0,
  );
  await assert.rejects(
    db.transaction(async (tx) => {
      await tx.insert(users).values({
        discordUserId: rollbackId,
        discordUsername: rollbackId,
        displayName: 'Explicit rollback',
      });
      tx.rollback();
    }),
    (error) => error instanceof TransactionRollbackError,
  );
  assert.equal(
    (await db.select().from(users).where(eq(users.discordUserId, rollbackId)))
      .length,
    0,
  );
  await db.transaction(async (tx) => {
    const nestedError = new Error('nested rollback');
    await assert.rejects(
      tx.transaction(async (nested) => {
        await nested.insert(users).values({
          discordUserId: rollbackId,
          discordUsername: rollbackId,
          displayName: 'Savepoint rollback',
        });
        throw nestedError;
      }),
      nestedError,
    );
    assert.equal(
      (await tx.select().from(users).where(eq(users.discordUserId, rollbackId)))
        .length,
      0,
    );
    assert.equal((await tx.execute(sql`select 1 as alive`)).rows[0].alive, 1);
  });
  const configured = await db.transaction(
    (tx) =>
      tx.execute(
        sql`select current_setting('transaction_isolation') as isolation, current_setting('transaction_read_only') as read_only`,
      ),
    {
      isolationLevel: 'serializable',
      accessMode: 'read only',
      deferrable: true,
    },
  );
  assert.deepEqual(configured.rows[0], {
    isolation: 'serializable',
    read_only: 'on',
  });
  assert.equal(
    (
      await db.transaction(
        (tx) => tx.execute(sql`select 1 as empty_config`),
        {},
      )
    ).rows[0].empty_config,
    1,
  );
  console.log('ban lookup recovery passed');
} finally {
  stallBegin = false;
  stallQuery = false;
  stallTransaction = null;
  disconnectTransaction = null;
  for (const socket of stalledSockets) socket.destroy();
  if (stalledSockets.size) await delay(50);
  await db.delete(ipBans).where(eq(ipBans.ip, BLOCKED_IP));
  await db.delete(users).where(eq(users.discordUserId, discordUserId));
  await locker.end();
  await db.$client.end();
  for (const socket of sockets) socket.destroy();
  await new Promise((resolve) => proxy.close(resolve));
}
