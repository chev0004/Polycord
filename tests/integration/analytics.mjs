import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
delete process.env.POLYCORD_ANALYTICS_DISABLED;
mock.module('server-only', () => ({}));
let currentUser = null;
mock.module('@/lib/auth', () => ({ getCurrentUser: async () => currentUser }));
const { db } = await import('../../src/db/client');
const { analyticsEvents, profiles, users } = await import(
  '../../src/db/schema'
);
const { upsertUserSettings } = await import('../../src/db/settings');
const { ANALYTICS_EVENTS } = await import('../../src/lib/analytics/events');
const { trackEvent } = await import('../../src/lib/analytics/track.server');
const { POST } = await import('../../src/app/api/analytics/route');
const { and, eq, inArray } = await import('drizzle-orm');

const id = randomUUID().replaceAll('-', '');
const [user] = await db
  .insert(users)
  .values({ discordUserId: id, discordUsername: id, displayName: id })
  .returning();
const [copier, owner] = await db
  .insert(users)
  .values(
    [0, 1].map(() => {
      const discordUserId = randomUUID().replaceAll('-', '');
      return {
        discordUserId,
        discordUsername: discordUserId,
        displayName: discordUserId,
      };
    }),
  )
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

  const [ownProfile, otherProfile] = await db
    .insert(profiles)
    .values(
      [copier, owner].map(({ id: userId }) => ({
        userId,
        isPublic: true,
        primaryLanguage: 'en',
        targetLanguage: 'ja',
        proficiencyLevel: 'beginner',
        bio: 'An isolated analytics test profile.',
      })),
    )
    .returning();
  currentUser = { id: copier.discordUserId, accountId: copier.id };
  const copy = (metadata) =>
    POST(
      new Request('http://localhost/api/analytics', {
        method: 'POST',
        body: JSON.stringify({ name: 'profile.username_copy', metadata }),
      }),
    );
  const copies = () =>
    db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.userId, copier.id),
          eq(analyticsEvents.name, 'profile.username_copy'),
        ),
      );
  await copy({ profileId: ownProfile.id });
  await copy(undefined);
  assert.equal((await copies()).length, 0);
  await copy({ profileId: otherProfile.id });
  assert.equal((await copies()).length, 1);
  await db.delete(analyticsEvents).where(eq(analyticsEvents.userId, copier.id));
  console.log('analytics consent passed');
} finally {
  await db
    .delete(analyticsEvents)
    .where(eq(analyticsEvents.anonymousId, anonymousId));
  await db
    .delete(users)
    .where(inArray(users.id, [user.id, copier.id, owner.id]));
  await globalThis.polycordSql.end();
}
