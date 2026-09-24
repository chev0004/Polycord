import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
process.env.POLYCORD_RATE_LIMIT_COPY = '1:3600';
process.env.POLYCORD_ANALYTICS_DISABLED = 'true';
mock.module('server-only', () => ({}));
mock.module('next/cache', () => ({ revalidatePath: () => {} }));
let identity;
mock.module('@/lib/auth', () => ({
  getActiveUser: async () => identity,
  getCurrentUser: async () => identity,
}));
const { db } = await import('../../src/db/client');
const {
  users,
  profiles,
  notifications,
  reports,
  rateLimitCounters,
  suspiciousActivity,
} = await import('../../src/db/schema');
const {
  upsertDiscordUser,
  upsertProfileForUser,
  listPublicProfiles,
  getPublicProfileById,
  mapProfileToDiscoveryProfile,
} = await import('../../src/db/profiles');
const { saveProfile, listSavedProfiles, listSavedProfileIds } = await import(
  '../../src/db/saved'
);
const { blockUser, unblockUser, listBlockedUsers } = await import(
  '../../src/db/safety'
);
const copy = await import('../../src/app/api/notifications/route');
const save = await import('../../src/app/api/saved/route');
const report = await import('../../src/app/api/report/route');
const block = await import('../../src/app/api/block/route');
const { eq, inArray } = await import('drizzle-orm');
const identities = ['Viewer', 'Target'].map((name) => ({
  id: randomUUID().replaceAll('-', ''),
  name,
  username: `private-${randomUUID()}`,
}));
const [viewer, target] = await Promise.all(identities.map(upsertDiscordUser));
Object.assign(identities[0], { accountId: viewer.id });
Object.assign(identities[1], { accountId: target.id });
const values = {
  isPublic: true,
  allowAnonymousCopy: false,
  displayAvailability: false,
  displayTimezone: false,
  primaryLanguage: 'en',
  targetLanguages: [{ language: 'ja', level: 'beginner' }],
  bio: 'Isolated privacy and safety test.',
  tags: [],
};
const [viewerProfile, targetProfile] = await Promise.all(
  [viewer, target].map((user) => upsertProfileForUser(user.id, values)),
);
const request = (profileId) =>
  new Request('http://localhost/api', {
    method: 'POST',
    body: JSON.stringify({ profileId, reason: 'spam' }),
  });
const absent = async (viewerId, profileId) => {
  assert.equal(await getPublicProfileById(profileId, viewerId), null);
  assert.equal(
    (await listPublicProfiles({ viewerUserId: viewerId })).some(
      (row) => row.id === profileId,
    ),
    false,
  );
  assert.equal(
    (await listSavedProfiles(viewerId)).some((row) => row.id === profileId),
    false,
  );
  assert.equal(
    (await listSavedProfileIds(viewerId)).includes(profileId),
    false,
  );
  for (const route of [copy, save, report, block])
    assert.equal((await route.POST(request(profileId))).status, 404);
};
try {
  identity = identities[0];
  await saveProfile(viewer.id, targetProfile.id);
  await saveProfile(target.id, viewerProfile.id);
  const guest = (await listPublicProfiles()).find(
    (row) => row.id === targetProfile.id,
  );
  assert.equal(guest.discordUsername, undefined);
  assert.equal(JSON.stringify(guest).includes(identities[1].username), false);
  assert.equal(
    mapProfileToDiscoveryProfile(await getPublicProfileById(targetProfile.id))
      .discordUsername,
    undefined,
  );
  assert.equal(
    (await listPublicProfiles({ viewerUserId: viewer.id })).find(
      (row) => row.id === targetProfile.id,
    ).discordUsername,
    identities[1].username,
  );
  assert.equal(
    (await listSavedProfiles(viewer.id))[0].discordUsername,
    identities[1].username,
  );
  await db
    .update(profiles)
    .set({ allowAnonymousCopy: true })
    .where(eq(profiles.id, targetProfile.id));
  assert.equal(
    (await listPublicProfiles()).find((row) => row.id === targetProfile.id)
      .discordUsername,
    identities[1].username,
  );
  assert.equal((await copy.POST(request(viewerProfile.id))).status, 200);
  assert.equal((await copy.POST(request(viewerProfile.id))).status, 200);
  for (const route of [save, report, block])
    assert.equal((await route.POST(request(viewerProfile.id))).status, 400);
  assert.equal((await copy.POST(request(targetProfile.id))).status, 200);
  const limited = await copy.POST(request(targetProfile.id));
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('Retry-After')) > 0);
  assert.equal(
    (
      await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, target.id))
    ).length,
    1,
  );
  await blockUser(viewer.id, target.id);
  await absent(viewer.id, targetProfile.id);
  identity = identities[1];
  await absent(target.id, viewerProfile.id);
  assert.deepEqual(await listBlockedUsers(target.id), []);
  assert.ok(await getPublicProfileById(targetProfile.id));
  assert.ok(await getPublicProfileById(viewerProfile.id, viewer.id));
  identity = identities[0];
  await unblockUser(viewer.id, target.id);
  assert.equal((await listSavedProfiles(viewer.id))[0].id, targetProfile.id);
  for (const [table, patch, reset] of [
    [profiles, { isPublic: false }, { isPublic: true }],
    [profiles, { hiddenByModeration: true }, { hiddenByModeration: false }],
    [
      users,
      { suspendedUntil: new Date(Date.now() + 60000) },
      { suspendedUntil: null },
    ],
    [users, { bannedAt: new Date() }, { bannedAt: null }],
  ]) {
    const id = table === users ? target.id : targetProfile.id;
    await db.update(table).set(patch).where(eq(table.id, id));
    await absent(viewer.id, targetProfile.id);
    await db.update(table).set(reset).where(eq(table.id, id));
  }
  await blockUser(viewer.id, target.id);
  await db.delete(profiles).where(eq(profiles.id, targetProfile.id));
  await absent(viewer.id, targetProfile.id);
  assert.deepEqual(await listBlockedUsers(viewer.id), [
    { id: target.id, displayName: target.displayName },
  ]);
  assert.equal(
    (
      await block.DELETE(
        new Request('http://localhost/api/block', {
          method: 'DELETE',
          body: JSON.stringify({ userId: target.id }),
        }),
      )
    ).status,
    200,
  );
  assert.deepEqual(await listBlockedUsers(viewer.id), []);
  for (const route of [copy, save, report, block])
    assert.equal((await route.POST(request('invalid'))).status, 400);
  assert.equal(
    (
      await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, target.id))
    ).length,
    1,
  );
  assert.equal(
    (
      await db
        .select()
        .from(reports)
        .where(eq(reports.reportedUserId, target.id))
    ).length,
    0,
  );
  console.log('safety checks passed');
} finally {
  await db
    .delete(suspiciousActivity)
    .where(inArray(suspiciousActivity.userId, [viewer.id, target.id]));
  await db
    .delete(rateLimitCounters)
    .where(
      inArray(rateLimitCounters.subject, [
        `user:${viewer.id}`,
        `user:${target.id}`,
      ]),
    );
  await db.delete(users).where(inArray(users.id, [viewer.id, target.id]));
  await globalThis.polycordSql.end();
}
