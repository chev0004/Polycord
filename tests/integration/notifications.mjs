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
mock.module('@/lib/auth', () => ({ getActiveUser: async () => currentUser }));
const { db } = await import('../../src/db/client');
const { users, profiles, userSettings, notifications, userBlocks } =
  await import('../../src/db/schema');
const {
  createNotification,
  listNotificationsForUser,
  hasRecentViewNotification,
} = await import('../../src/db/notifications');
const { notifyProfileView } = await import(
  '../../src/lib/notifications/profileView'
);
const { GET, POST, PATCH, DELETE } = await import(
  '../../src/app/api/notifications/route'
);
const { eq, inArray } = await import('drizzle-orm');
const people = await db
  .insert(users)
  .values(
    Array.from({ length: 3 }, () => ({
      discordUserId: randomUUID().replaceAll('-', ''),
      discordUsername: 'notification-test',
      displayName: 'Same name',
    })),
  )
  .returning();
const [owner, first, second] = people;
const asUser = (user) => {
  currentUser = {
    id: user.discordUserId,
    name: user.displayName,
    username: user.discordUsername,
  };
};
const request = (method, body) =>
  new Request('http://localhost/api/notifications', {
    method,
    body: JSON.stringify(body),
  });
try {
  const profileRows = await db
    .insert(profiles)
    .values(
      people.map((user) => ({
        userId: user.id,
        isPublic: true,
        primaryLanguage: 'en',
        targetLanguage: 'ja',
        proficiencyLevel: 'beginner',
        bio: 'An isolated notification test profile.',
      })),
    )
    .returning();
  const profileFor = (user) =>
    profileRows.find((profile) => profile.userId === user.id).id;
  await db
    .insert(userSettings)
    .values({ userId: owner.id, profileViewAlert: true });
  const copy = await createNotification({
    userId: owner.id,
    kind: 'copy',
    actorUserId: first.id,
    actorName: first.displayName,
    actorAvatarUrl: 'https://example.com/avatar.png',
  });
  const warning = await createNotification({
    userId: owner.id,
    kind: 'warning',
  });
  for (const actor of [first, second, first]) {
    await notifyProfileView({
      ownerUserId: owner.id,
      actor: { id: actor.id, name: actor.displayName, avatarUrl: null },
    });
  }
  const views = (await listNotificationsForUser(owner.id)).filter(
    (row) => row.notification.kind === 'view',
  );
  assert.equal(views.length, 2);
  assert.equal(
    await hasRecentViewNotification(owner.id, first.id, new Date(0)),
    true,
  );
  await notifyProfileView({ ownerUserId: owner.id, actor: null });
  const anonymous = (await listNotificationsForUser(owner.id)).find(
    (row) => row.notification.isGuest,
  );
  assert.equal(anonymous.notification.actorUserId, null);
  assert.equal(anonymous.notification.actorName, null);
  asUser(owner);
  const response = await GET();
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  let body = await response.json();
  assert.equal(body.premium, false);
  assert.deepEqual(body.notifications.map((row) => row.kind).sort(), [
    'copy',
    'warning',
  ]);
  assert.ok(body.notifications.some((row) => row.id === warning.id));
  for (const row of body.notifications) {
    assert.equal(row.actorName, undefined);
    assert.equal(row.actorAvatarUrl, undefined);
    assert.equal(row.actorProfileId, undefined);
    assert.equal(row.actorUserId, undefined);
  }
  process.env.POLYCORD_PREMIUM_USER_IDS = owner.discordUserId;
  body = await (await GET()).json();
  assert.equal(body.premium, true);
  assert.equal(
    body.notifications.find((row) => row.id === copy.id).actorProfileId,
    profileFor(first),
  );
  for (const update of [
    { isPublic: false },
    { isPublic: true, hiddenByModeration: true },
  ]) {
    await db.update(profiles).set(update).where(eq(profiles.userId, first.id));
    body = await (await GET()).json();
    assert.equal(
      body.notifications.find((row) => row.id === copy.id).actorProfileId,
      undefined,
    );
    assert.equal(
      body.notifications.find((row) => row.id === copy.id).actorName,
      undefined,
    );
  }
  await db
    .update(profiles)
    .set({ hiddenByModeration: false })
    .where(eq(profiles.userId, first.id));
  for (const update of [
    { bannedAt: new Date() },
    { bannedAt: null, suspendedUntil: new Date(Date.now() + 60000) },
  ]) {
    await db.update(users).set(update).where(eq(users.id, first.id));
    body = await (await GET()).json();
    assert.equal(
      body.notifications.find((row) => row.id === copy.id).actorProfileId,
      undefined,
    );
  }
  await db
    .update(users)
    .set({ suspendedUntil: null })
    .where(eq(users.id, first.id));
  for (const [blocker, blocked] of [
    [owner, first],
    [first, owner],
  ]) {
    await db
      .insert(userBlocks)
      .values({ blockerUserId: blocker.id, blockedUserId: blocked.id });
    body = await (await GET()).json();
    assert.equal(
      body.notifications.find((row) => row.id === copy.id).actorProfileId,
      undefined,
    );
    const rejected = await POST(
      request('POST', { profileId: profileFor(first) }),
    );
    assert.equal(rejected.status, 404);
    assert.equal((await listNotificationsForUser(first.id)).length, 0);
    await db.delete(userBlocks).where(eq(userBlocks.blockerUserId, blocker.id));
  }
  await db
    .update(profiles)
    .set({ hiddenByModeration: true })
    .where(eq(profiles.userId, first.id));
  assert.equal(
    (await POST(request('POST', { profileId: profileFor(first) }))).status,
    404,
  );
  assert.equal(
    (await POST(request('POST', { profileId: 'invalid' }))).status,
    400,
  );
  assert.equal(
    (await PATCH(request('PATCH', { id: 'invalid', read: true }))).status,
    400,
  );
  assert.equal(
    (await DELETE(request('DELETE', { id: 'invalid' }))).status,
    400,
  );
  assert.equal(
    (await POST(request('POST', { profileId: profileFor(owner) }))).status,
    200,
  );
  await db
    .update(userSettings)
    .set({ profileInteractionAlert: false, profileViewAlert: false })
    .where(eq(userSettings.userId, owner.id));
  assert.equal(
    await createNotification({ userId: owner.id, kind: 'copy' }),
    null,
  );
  assert.equal(
    await createNotification({ userId: owner.id, kind: 'view' }),
    null,
  );
  assert.ok(await createNotification({ userId: owner.id, kind: 'warning' }));
  asUser(second);
  assert.deepEqual((await (await GET()).json()).notifications, []);
  await PATCH(request('PATCH', { id: copy.id, read: true }));
  await DELETE(request('DELETE', { id: copy.id }));
  let [persisted] = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, copy.id));
  assert.equal(persisted.read, false);
  asUser(owner);
  await PATCH(request('PATCH', { id: copy.id, read: true }));
  [persisted] = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, copy.id));
  assert.equal(persisted.read, true);
  await db.delete(users).where(eq(users.id, first.id));
  body = await (await GET()).json();
  assert.equal(
    body.notifications.find((row) => row.id === copy.id).actorProfileId,
    undefined,
  );
  assert.equal(
    body.notifications.find((row) => row.id === copy.id).actorName,
    undefined,
  );
  await DELETE(request('DELETE', { all: true }));
  assert.deepEqual((await (await GET()).json()).notifications, []);
  currentUser = null;
  assert.equal((await GET()).status, 401);
  console.log('notification boundaries passed');
} finally {
  await db.delete(users).where(
    inArray(
      users.id,
      people.map((user) => user.id),
    ),
  );
  await globalThis.polycordSql.end();
}
