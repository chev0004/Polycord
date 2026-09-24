import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
delete process.env.POLYCORD_ANALYTICS_DISABLED;
mock.module('server-only', () => ({}));
const { db } = await import('../../src/db/client');
const { analyticsEvents, users } = await import('../../src/db/schema');
const { upsertUserSettings } = await import('../../src/db/settings');
const { ANALYTICS_EVENTS } = await import('../../src/lib/analytics/events');
const { trackEvent } = await import('../../src/lib/analytics/track.server');
const { eq } = await import('drizzle-orm');

const id = randomUUID().replaceAll('-', '');
const [user] = await db
  .insert(users)
  .values({ discordUserId: id, discordUsername: id, displayName: id })
  .returning();
const anonymousId = `analytics-${id}`;
const eventsFor = () =>
  db
    .select()
    .from(analyticsEvents)
    .where(eq(analyticsEvents.anonymousId, anonymousId));

try {
  await upsertUserSettings(user.id, { productAnalytics: false });
  await trackEvent({
    name: ANALYTICS_EVENTS.discoveryView,
    userId: user.id,
    anonymousId,
  });
  assert.equal((await eventsFor()).length, 0);

  await upsertUserSettings(user.id, { productAnalytics: true });
  await trackEvent({
    name: ANALYTICS_EVENTS.discoveryView,
    userId: user.id,
    anonymousId,
  });
  const [event] = await eventsFor();
  assert.equal(event.userId, user.id);

  await db.delete(users).where(eq(users.id, user.id));
  const [retained] = await eventsFor();
  assert.equal(retained.userId, null);
  console.log('analytics consent passed');
} finally {
  await db
    .delete(analyticsEvents)
    .where(eq(analyticsEvents.anonymousId, anonymousId));
  await db.delete(users).where(eq(users.id, user.id));
  await globalThis.polycordSql.end();
}
