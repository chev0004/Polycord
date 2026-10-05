import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
mock.module('server-only', () => ({}));
const { db } = await import('../../src/db/client');
const { users } = await import('../../src/db/schema');
const { lookupBan, BAN_STATEMENT_TIMEOUT_MS } = await import(
  '../../src/lib/banLookup'
);
const { eq } = await import('drizzle-orm');

const discordUserId = randomUUID().replaceAll('-', '');
await db.insert(users).values({
  discordUserId,
  discordUsername: 'ban-lookup-test',
  displayName: 'Ban Lookup',
  bannedAt: new Date('2026-10-04T00:00:00Z'),
});
const locker = postgres(url.href, { max: 1 });
const signal = () => new AbortController().signal;

try {
  const found = await lookupBan(null, [discordUserId], signal());
  assert.equal(found?.date.toISOString(), '2026-10-04T00:00:00.000Z');

  const aborted = new AbortController();
  aborted.abort();
  await assert.rejects(
    lookupBan('203.0.113.250', [discordUserId], aborted.signal),
  );

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
  console.log('ban lookup recovery passed');
} finally {
  await db.delete(users).where(eq(users.discordUserId, discordUserId));
  await locker.end();
  process.exit(0);
}
