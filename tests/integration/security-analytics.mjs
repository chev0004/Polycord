import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
process.env.POLYCORD_RATE_LIMIT_ANALYTICS = '3:3600';
process.env.POLYCORD_CLIENT_IP_HEADER = 'x-nf-client-connection-ip';
delete process.env.POLYCORD_ANALYTICS_DISABLED;
mock.module('server-only', () => ({}));
let currentUser = null;
mock.module('@/lib/auth', () => ({ getCurrentUser: async () => currentUser }));
const { db } = await import('../../src/db/client');
const { analyticsEvents, rateLimitCounters, suspiciousActivity, users } =
  await import('../../src/db/schema');
const { POST } = await import('../../src/app/api/analytics/route');
const { and, eq, inArray, isNull, sql } = await import('drizzle-orm');

const id = randomUUID().replaceAll('-', '');
const [user] = await db
  .insert(users)
  .values({ discordUserId: id, discordUsername: id, displayName: id })
  .returning();
const ip = [
  '127',
  ...Array.from({ length: 3 }, () => Math.floor(Math.random() * 254) + 1),
].join('.');
const subjects = [`user:${user.id}`, `ip:${ip}`];
const profileIds = Array.from({ length: 6 }, () => randomUUID());
const source = randomUUID();
const anonymousEvent = and(
  isNull(analyticsEvents.userId),
  eq(sql`${analyticsEvents.metadata}->>'source'`, source),
);

try {
  currentUser = { id, accountId: user.id };
  for (const profileId of profileIds) {
    const response = await POST(
      new Request('http://localhost/api/analytics', {
        method: 'POST',
        body: JSON.stringify({
          name: 'profile.username_copy',
          metadata: { profileId },
        }),
      }),
    );
    assert.equal(response.status, 204);
  }

  const events = await db
    .select()
    .from(analyticsEvents)
    .where(eq(analyticsEvents.userId, user.id));
  currentUser = null;
  for (const profileId of profileIds) {
    const response = await POST(
      new Request('http://localhost/api/analytics', {
        method: 'POST',
        headers: { 'x-nf-client-connection-ip': ip },
        body: JSON.stringify({
          name: 'profile.username_copy',
          metadata: { profileId, source },
        }),
      }),
    );
    assert.equal(response.status, 204);
  }
  const anonymous = await db
    .select()
    .from(analyticsEvents)
    .where(anonymousEvent);
  assert.equal(anonymous.length, 3);
  const counters = await db
    .select()
    .from(rateLimitCounters)
    .where(inArray(rateLimitCounters.subject, subjects));
  const flagged = await db
    .select()
    .from(suspiciousActivity)
    .where(eq(suspiciousActivity.userId, user.id));
  assert.equal(events.length, 3);
  assert.deepEqual(
    counters.map(({ count }) => count),
    [6, 6],
  );
  assert.equal(flagged.length, 0);
  console.log('analytics throttle passed');
} finally {
  await db.delete(analyticsEvents).where(anonymousEvent);
  await db.delete(analyticsEvents).where(eq(analyticsEvents.userId, user.id));
  await db
    .delete(rateLimitCounters)
    .where(inArray(rateLimitCounters.subject, subjects));
  await db.delete(users).where(eq(users.id, user.id));
  await db.$client.end();
}
