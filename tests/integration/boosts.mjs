import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
process.env.POLYCORD_PREMIUM_USER_IDS = '';
mock.module('server-only', () => ({}));
const { db } = await import('../../src/db/client');
const { users, profiles, subscriptions, profileBoosts } = await import(
  '../../src/db/schema'
);
const { boostProfileForUser } = await import('../../src/db/boosts');
const { eq } = await import('drizzle-orm');
const [user] = await db
  .insert(users)
  .values({
    discordUserId: randomUUID().slice(0, 32),
    discordUsername: 'boost-test',
    displayName: 'Boost test',
  })
  .returning();
try {
  await db.insert(profiles).values({
    userId: user.id,
    isPublic: true,
    primaryLanguage: 'en',
    targetLanguage: 'ja',
    proficiencyLevel: 'beginner',
    bio: 'A profile for concurrent boost verification.',
  });
  await db.insert(subscriptions).values({
    userId: user.id,
    stripeCustomerId: randomUUID(),
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 86400000),
  });
  await db
    .insert(profileBoosts)
    .values([{ userId: user.id }, { userId: user.id }]);
  const results = await Promise.all([
    boostProfileForUser(user.id),
    boostProfileForUser(user.id),
  ]);
  assert.equal(results.filter((result) => !result.error).length, 1);
  assert.equal(results.find((result) => result.error)?.status, 409);
  assert.equal(results.find((result) => !result.error)?.remaining, 0);
  const usage = await db
    .select()
    .from(profileBoosts)
    .where(eq(profileBoosts.userId, user.id));
  assert.equal(usage.length, 3);
  await db
    .update(profiles)
    .set({ boostedUntil: new Date(Date.now() - 1000) })
    .where(eq(profiles.userId, user.id));
  assert.equal((await boostProfileForUser(user.id)).status, 429);
  console.log('boost concurrency passed');
} finally {
  await db.delete(users).where(eq(users.id, user.id));
  await globalThis.polycordSql.end();
}
