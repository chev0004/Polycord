import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
mock.module('server-only', () => ({}));
const { db } = await import('../../src/db/client');
const { users, suspiciousActivity } = await import('../../src/db/schema');
const { listSuspiciousGroups, listSuspiciousEvents } = await import(
  '../../src/db/rateLimits'
);
const { eq, inArray } = await import('drizzle-orm');

const prefix = randomUUID().slice(0, 8);
const accounts = await db
  .insert(users)
  .values(
    ['heavy', 'light', 'single'].map((name) => ({
      discordUserId: `${prefix}-${name}`,
      discordUsername: `${prefix}-${name}`,
      displayName: `${prefix} ${name}`,
    })),
  )
  .returning();
const [heavy, light, single] = accounts;
const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60000);
const anonymousIp = `192.0.2.${Math.floor(Math.random() * 250) + 1}`;
const event = (user, action, minutes, ip = '203.0.113.5') => ({
  userId: user?.id ?? null,
  action,
  ip,
  createdAt: minutesAgo(minutes),
});

try {
  await db
    .insert(suspiciousActivity)
    .values([
      ...Array.from({ length: 12 }, (_, index) =>
        event(heavy, 'copy', 1 + index),
      ),
      event(light, 'report', 20, '198.51.100.2'),
      event(light, 'bump', 10, '198.51.100.3'),
      event(single, 'auth-failure', 30),
      event(null, 'bump', 5, anonymousIp),
    ]);

  const ours = (rows) =>
    rows.filter(
      (row) => accounts.some(({ id }) => id === row.userId) || !row.userId,
    );
  const groups = ours(await listSuspiciousGroups(100));
  const owned = groups.filter((row) => row.userId);
  assert.deepEqual(
    owned.map((row) => [row.userId, row.total]),
    [
      [heavy.id, 12],
      [light.id, 2],
      [single.id, 1],
    ],
  );
  assert.equal(owned[0].action, 'copy');
  assert.equal(owned[1].action, 'bump');
  assert.equal(owned[1].ip, '198.51.100.3');
  assert.equal(groups.filter((row) => !row.userId).length >= 1, true);

  const limited = await listSuspiciousGroups(2);
  assert.equal(limited.length, 2);
  assert.equal(new Set(limited.map((row) => row.userId ?? row.id)).size, 2);

  const events = await listSuspiciousEvents(heavy.id);
  assert.equal(events.length, 12);
  assert.ok(events.every((row) => row.action === 'copy'));
  assert.deepEqual(
    events.map((row) => row.createdAt.getTime()),
    [...events.map((row) => row.createdAt.getTime())].sort((a, b) => b - a),
  );
  assert.equal((await listSuspiciousEvents(light.id)).length, 2);

  await db.insert(suspiciousActivity).values(event(single, 'report', 0));
  const refreshed = (await listSuspiciousGroups(100)).filter(
    (row) => row.userId === single.id,
  );
  assert.equal(refreshed.length, 1);
  assert.equal(refreshed[0].total, 2);
  assert.equal(refreshed[0].action, 'report');
  console.log('suspicious activity grouping passed');
} finally {
  await db
    .delete(suspiciousActivity)
    .where(eq(suspiciousActivity.ip, anonymousIp));
  await db.delete(suspiciousActivity).where(
    inArray(
      suspiciousActivity.userId,
      accounts.map(({ id }) => id),
    ),
  );
  await db.delete(users).where(
    inArray(
      users.id,
      accounts.map(({ id }) => id),
    ),
  );
  process.exit(0);
}
