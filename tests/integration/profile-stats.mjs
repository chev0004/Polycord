import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
mock.module('server-only', () => ({}));
const { db } = await import('../../src/db/client');
const { users, profiles, analyticsEvents } = await import(
  '../../src/db/schema'
);
const { getProfileStatsForUser } = await import('../../src/db/profileStats');
const { createNotification, deleteNotification, clearNotifications } =
  await import('../../src/db/notifications');
const { eq } = await import('drizzle-orm');
const [user] = await db
  .insert(users)
  .values({
    discordUserId: randomUUID().slice(0, 32),
    discordUsername: 'stats-test',
    displayName: 'Stats test',
  })
  .returning();
try {
  const [profile] = await db
    .insert(profiles)
    .values({
      userId: user.id,
      isPublic: true,
      primaryLanguage: 'en',
      targetLanguage: 'ja',
      proficiencyLevel: 'beginner',
      bio: 'A profile for durable copy history.',
    })
    .returning();
  await db.insert(analyticsEvents).values({
    name: 'profile.copy_received',
    userId: user.id,
    metadata: { ownerUserId: user.id },
  });
  const notification = await createNotification({
    userId: user.id,
    kind: 'copy',
    isGuest: true,
  });
  assert.equal(
    (await getProfileStatsForUser(user.id, profile.id)).copies30d,
    1,
  );
  await deleteNotification(user.id, notification.id);
  assert.equal(
    (await getProfileStatsForUser(user.id, profile.id)).copies30d,
    1,
  );
  await createNotification({ userId: user.id, kind: 'copy', isGuest: true });
  await clearNotifications(user.id);
  assert.equal(
    (await getProfileStatsForUser(user.id, profile.id)).copies30d,
    1,
  );
  console.log('copy history passed');
} finally {
  await db.delete(analyticsEvents).where(eq(analyticsEvents.userId, user.id));
  await db.delete(users).where(eq(users.id, user.id));
  await globalThis.polycordSql.end();
}
