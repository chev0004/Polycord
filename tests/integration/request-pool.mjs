import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { sql } from 'drizzle-orm';
import { Client } from 'pg';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
url.searchParams.set('application_name', 'request-pool-test');
process.env.DATABASE_URL = url.href;
process.env.AWS_LAMBDA_FUNCTION_NAME = 'request-pool';
mock.module('server-only', () => ({}));
const { db, scopedRoute } = await import('../../src/db/client');

const observer = new Client({ connectionString: process.env.DATABASE_URL });
await observer.connect();
const count = async (filter = 'true') =>
  Number(
    (
      await observer.query(
        `select count(*) from pg_stat_activity where datname = current_database() and application_name = 'request-pool-test' and pid <> pg_backend_pid() and ${filter}`,
      )
    ).rows[0].count,
  );
const settle = async () => {
  for (let attempt = 0; attempt < 50 && (await count()) > 0; attempt++)
    await sleep(100);
  return count();
};

const queries = async (value, observe = false) => {
  let peak = 0;
  for (let query = 0; query < 8; query++) {
    await db.execute(sql`select ${value}::int`);
    if (observe) peak = Math.max(peak, await count());
  }
  return peak;
};
const peak = await scopedRoute(() => queries(1, true))();
assert.ok(peak > 0 && peak <= 3, `peak ${peak}`);
assert.equal(await settle(), 0);

await assert.rejects(
  scopedRoute(async () => {
    await db.execute(sql`select 1`);
    throw new Error('failed');
  })(),
  /failed/,
);
assert.equal(await settle(), 0);

await scopedRoute(() =>
  db.transaction(async (tx) => {
    await tx.execute(sql`select 1`);
  }),
)();
await assert.rejects(
  scopedRoute(() =>
    db.transaction(async (tx) => {
      await tx.execute(sql`select 1`);
      throw new Error('rolled back');
    }),
  )(),
  /rolled back/,
);
assert.equal(await settle(), 0);

await Promise.all(
  Array.from({ length: 20 }, (_, index) => scopedRoute(() => queries(index))()),
);
assert.equal(await count("state = 'idle in transaction'"), 0);
assert.equal(await settle(), 0);

await observer.end();
console.log('request pool passed');
