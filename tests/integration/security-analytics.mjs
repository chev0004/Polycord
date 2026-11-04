import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
process.env.POLYCORD_RATE_LIMIT_ANALYTICS = '3:3600';
delete process.env.POLYCORD_ANALYTICS_DISABLED;
mock.module('server-only', () => ({}));
let currentUser = null;
mock.module('@/lib/auth', () => ({ getCurrentUser: async () => currentUser }));
const { db } = await import('../../src/db/client');
const { analyticsEvents, rateLimitCounters, suspiciousActivity, users } =
  await import('../../src/db/schema');
const { POST } = await import('../../src/app/api/analytics/route');
const { eq } = await import('drizzle-orm');

const id = randomUUID().replaceAll('-', '');
const [user] = await db
  .insert(users)
  .values({ discordUserId: id, discordUsername: id, displayName: id })
  .returning();
const subject = `user:${user.id}`;

try {
  currentUser = { id, accountId: user.id };
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await POST(
      new Request('http://localhost/api/analytics', {
        method: 'POST',
        body: JSON.stringify({
          name: 'profile.username_copy',
          metadata: { profileId: randomUUID() },
        }),
      }),
    );
    assert.equal(response.status, 204);
  }

  const events = await db
    .select()
    .from(analyticsEvents)
    .where(eq(analyticsEvents.userId, user.id));
  const [counter] = await db
    .select()
    .from(rateLimitCounters)
    .where(eq(rateLimitCounters.subject, subject));
  const flagged = await db
    .select()
    .from(suspiciousActivity)
    .where(eq(suspiciousActivity.userId, user.id));
  assert.equal(events.length, 3);
  assert.equal(counter.count, 6);
  assert.equal(flagged.length, 0);
  console.log('analytics throttle passed');
} finally {
  await db.delete(analyticsEvents).where(eq(analyticsEvents.userId, user.id));
  await db
    .delete(rateLimitCounters)
    .where(eq(rateLimitCounters.subject, subject));
  await db.delete(users).where(eq(users.id, user.id));
  await db.$client.end();
}
