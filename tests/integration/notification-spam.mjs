import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = '';
process.env.POLYCORD_PREMIUM_USER_IDS = '';
process.env.POLYCORD_ANALYTICS_DISABLED = 'true';
mock.module('server-only', () => ({}));
let currentUser = null;
mock.module('@/lib/auth', () => ({
  getActiveUser: async () => currentUser,
  getCurrentUser: async () => currentUser,
}));
const { db } = await import('../../src/db/client');
const { users, profiles, userSettings, notifications, rateLimitCounters } =
  await import('../../src/db/schema');
const { POST: copy } = await import('../../src/app/api/notifications/route');
const { POST: share } = await import('../../src/app/api/profile/share/route');
const { eq, inArray, like, sql } = await import('drizzle-orm');
const people = await db
  .insert(users)
  .values(
    Array.from({ length: 3 }, () => ({
      discordUserId: randomUUID().replaceAll('-', ''),
      discordUsername: 'spam-test',
      displayName: 'Spam test',
    })),
  )
  .returning();
const [owner, first, second] = people;
const asUser = (user) => {
  currentUser = user && {
    id: user.discordUserId,
    accountId: user.id,
    name: user.displayName,
    username: user.discordUsername,
  };
};
const ownerRows = () =>
  db.select().from(notifications).where(eq(notifications.userId, owner.id));
const post = (handler, path, profileId, ip = '203.0.113.1') =>
  handler(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'x-nf-client-connection-ip': ip },
      body: JSON.stringify({ profileId }),
    }),
  );
const createdCount = async (handler, path, profileId, attempts, ip) => {
  let created = 0;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await post(handler, path, profileId, ip);
    assert.equal(response.status, 200);
    if ((await response.json()).created) created++;
  }
  return created;
};
const copyTo = (profileId, attempts, ip) =>
  createdCount(copy, '/api/notifications', profileId, attempts, ip);
const shareTo = (profileId, attempts, ip) =>
  createdCount(share, '/api/profile/share', profileId, attempts, ip);
try {
  const [profile] = await db
    .insert(profiles)
    .values({
      userId: owner.id,
      isPublic: true,
      primaryLanguage: 'en',
      targetLanguage: 'ja',
      proficiencyLevel: 'beginner',
      bio: 'An isolated notification spam test profile.',
      allowAnonymousCopy: true,
    })
    .returning();
  await db
    .insert(userSettings)
    .values({ userId: owner.id, profileInteractionAlert: true });

  asUser(first);
  assert.equal(await copyTo(profile.id, 6), 1);
  assert.equal(await shareTo(profile.id, 6), 1);
  assert.equal((await ownerRows()).length, 2);
  assert.ok((await ownerRows()).every((row) => row.read === false));

  await db.delete(notifications).where(eq(notifications.userId, owner.id));
  assert.equal(await copyTo(profile.id, 3), 0);
  assert.equal(await shareTo(profile.id, 3), 0);
  assert.equal((await ownerRows()).length, 0);

  asUser(second);
  assert.equal(await copyTo(profile.id, 3), 1);
  assert.equal(await shareTo(profile.id, 3), 1);

  asUser(null);
  assert.equal(await copyTo(profile.id, 3, '198.51.100.7'), 1);
  assert.equal(await copyTo(profile.id, 3, '198.51.100.7'), 0);
  assert.equal(await shareTo(profile.id, 3, '198.51.100.7'), 1);
  assert.equal(await copyTo(profile.id, 1, '198.51.100.8'), 1);

  await db.delete(notifications).where(eq(notifications.userId, owner.id));
  await db
    .update(rateLimitCounters)
    .set({ windowStart: sql`now() - interval '2 hours'` })
    .where(like(rateLimitCounters.scope, 'notify-kind:%'));
  asUser(first);
  assert.equal(await copyTo(profile.id, 3), 1);

  await db.delete(notifications).where(eq(notifications.userId, owner.id));
  await db
    .update(rateLimitCounters)
    .set({ windowStart: sql`now() - interval '2 hours'` })
    .where(like(rateLimitCounters.scope, 'notify-kind:%'));
  assert.equal(await copyTo(profile.id, 3), 0);
  assert.equal(await shareTo(profile.id, 3), 0);

  await db
    .update(rateLimitCounters)
    .set({ windowStart: sql`now() - interval '2 days'` })
    .where(like(rateLimitCounters.scope, 'notify-%'));
  assert.equal(await copyTo(profile.id, 3), 1);

  console.log('notification spam protection passed');
} finally {
  await db
    .delete(rateLimitCounters)
    .where(like(rateLimitCounters.scope, 'notify-%'));
  await db.delete(users).where(
    inArray(
      users.id,
      people.map((user) => user.id),
    ),
  );
  await globalThis.polycordSql.end();
}
