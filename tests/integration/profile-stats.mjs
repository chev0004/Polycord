import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
mock.module('server-only', () => ({}));
const { db } = await import('../../src/db/client');
const { users, profiles, userSettings, notifications } = await import(
  '../../src/db/schema'
);
const { getProfileStatsForUser, recordProfileInteraction } = await import(
  '../../src/db/profileStats'
);
const { createNotification, deleteNotification, clearNotifications } =
  await import('../../src/db/notifications');
const { receiveProfileView } = await import(
  '../../src/lib/notifications/profileView'
);
const { and, eq, inArray } = await import('drizzle-orm');

const createUser = async (name, values = {}) => {
  const [user] = await db
    .insert(users)
    .values({
      discordUserId: randomUUID().slice(0, 32),
      discordUsername: name,
      displayName: name,
      ...values,
    })
    .returning();
  return user;
};
const asViewer = (user) => ({
  id: user.discordUserId,
  accountId: user.id,
  name: user.displayName,
});

const owner = await createUser('stats-owner');
const viewer = await createUser('stats-viewer');
const dummy = await createUser('stats-dummy', { isSynthetic: true });
const created = [owner.id, viewer.id, dummy.id];
try {
  const [profile] = await db
    .insert(profiles)
    .values({
      userId: owner.id,
      isPublic: true,
      primaryLanguage: 'en',
      targetLanguage: 'ja',
      proficiencyLevel: 'beginner',
      bio: 'A profile for received interaction stats.',
    })
    .returning();
  const stats = () => getProfileStatsForUser(owner.id, profile.id);

  await recordProfileInteraction(owner.id, 'copy');
  const notification = await createNotification({
    userId: owner.id,
    kind: 'copy',
    isGuest: true,
  });
  assert.equal((await stats()).copies30d, 1);
  await deleteNotification(owner.id, notification.id);
  assert.equal((await stats()).copies30d, 1);
  await createNotification({ userId: owner.id, kind: 'copy', isGuest: true });
  await clearNotifications(owner.id);
  assert.equal((await stats()).copies30d, 1);
  console.log('copy history passed');

  await db.insert(userSettings).values([
    { userId: owner.id, profileViewAlert: true },
    { userId: viewer.id, productAnalytics: false },
  ]);
  await receiveProfileView({
    ownerUserId: owner.id,
    synthetic: false,
    viewer: asViewer(viewer),
  });
  await receiveProfileView({
    ownerUserId: owner.id,
    synthetic: false,
    viewer: null,
  });
  await receiveProfileView({
    ownerUserId: owner.id,
    synthetic: false,
    viewer: asViewer(owner),
  });
  await receiveProfileView({
    ownerUserId: dummy.id,
    synthetic: true,
    viewer: asViewer(viewer),
  });
  assert.equal((await stats()).views30d, 2);
  assert.equal(
    (await getProfileStatsForUser(dummy.id, profile.id)).views30d,
    0,
  );
  const viewNotifications = await db
    .select()
    .from(notifications)
    .where(
      and(eq(notifications.userId, owner.id), eq(notifications.kind, 'view')),
    );
  assert.deepEqual(
    viewNotifications.map(({ actorUserId, isGuest }) => ({
      actorUserId,
      isGuest,
    })),
    [
      { actorUserId: viewer.id, isGuest: false },
      { actorUserId: null, isGuest: true },
    ],
  );

  await db
    .update(userSettings)
    .set({ profileViewAlert: false })
    .where(eq(userSettings.userId, owner.id));
  await receiveProfileView({
    ownerUserId: owner.id,
    synthetic: false,
    viewer: null,
  });
  assert.equal((await stats()).views30d, 3);
  console.log('received views passed');
} finally {
  await db.delete(users).where(inArray(users.id, created));
  await globalThis.polycordSql.end();
}
