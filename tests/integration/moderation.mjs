import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
mock.module('server-only', () => ({}));
const { db } = await import('../../src/db/client');
const { users, reports, moderationRestrictions } = await import(
  '../../src/db/schema'
);
const {
  upsertDiscordUser,
  upsertProfileForUser,
  deleteProfileForUser,
  getPublicProfileById,
  listPublicProfilesByIds,
} = await import('../../src/db/profiles');
const { listDiscoveryPage } = await import('../../src/db/discovery');
const { parseDiscoveryState } = await import(
  '../../src/features/Discovery/discoveryUrlState'
);
const {
  setUserBanned,
  setUserSuspendedUntil,
  setProfileHiddenByModeration,
  isUserRestricted,
  listReportsWithContext,
} = await import('../../src/db/moderation');
const { deleteAccountByDiscordId } = await import('../../src/db/account');
const { eq } = await import('drizzle-orm');
const identity = {
  id: randomUUID().slice(0, 32),
  name: `Moderation ${randomUUID()}`,
};
const discoveryState = parseDiscoveryState(
  new URLSearchParams({ q: identity.name }),
);
const reporter = await upsertDiscordUser({
  id: randomUUID().slice(0, 32),
  name: 'Report test',
});
let user = await upsertDiscordUser(identity);
try {
  await setUserBanned(user.id, true);
  await deleteAccountByDiscordId(identity.id);
  user = await upsertDiscordUser(identity);
  assert.equal(isUserRestricted(user), true);
  await setUserBanned(user.id, false);
  await setUserSuspendedUntil(user.id, new Date(Date.now() + 86400000));
  await deleteAccountByDiscordId(identity.id);
  user = await upsertDiscordUser(identity);
  assert.equal(isUserRestricted(user), true);
  await setUserSuspendedUntil(user.id, null);
  const values = {
    isPublic: true,
    allowAnonymousCopy: true,
    displayAvailability: true,
    displayTimezone: true,
    primaryLanguage: 'en',
    targetLanguages: [{ language: 'ja', level: 'beginner' }],
    bio: 'A profile for durable moderation checks.',
    availability: null,
    tags: [],
  };
  await upsertProfileForUser(user.id, values);
  await setProfileHiddenByModeration(user.id, true);
  await deleteProfileForUser(user.id);
  const profile = await upsertProfileForUser(user.id, values);
  assert.equal(profile.hiddenByModeration, true);
  assert.equal(await getPublicProfileById(profile.id), null);
  assert.equal((await listDiscoveryPage(discoveryState, 'en', {})).total, 0);
  assert.equal((await listPublicProfilesByIds([profile.id])).length, 0);
  await setProfileHiddenByModeration(user.id, false);
  assert.ok(await getPublicProfileById(profile.id));
  assert.equal(
    (await listDiscoveryPage(discoveryState, 'en', {})).profiles[0].id,
    profile.id,
  );
  const created = await db
    .insert(reports)
    .values(
      Array.from({ length: 105 }, (_, i) => ({
        reporterUserId: reporter.id,
        reportedUserId: user.id,
        reportedProfileId: profile.id,
        reason: 'spam',
        createdAt: new Date(Date.now() + i),
      })),
    )
    .returning();
  const first = await listReportsWithContext(100, 1);
  const second = await listReportsWithContext(100, 2);
  assert.equal(
    new Set([...first, ...second].map((row) => row.report.id)).size,
    105,
  );
  await db
    .update(reports)
    .set({ status: 'dismissed' })
    .where(eq(reports.id, created[104].id));
  assert.ok(
    (await listReportsWithContext(100, 1)).some(
      (row) => row.report.id === created[0].id,
    ),
  );
  assert.ok(
    (await listReportsWithContext(100, 1, true)).some(
      (row) => row.report.id === created[104].id,
    ),
  );
  console.log('moderation lifecycle passed');
} finally {
  await db.delete(users).where(eq(users.id, user.id));
  await db.delete(users).where(eq(users.id, reporter.id));
  await db
    .delete(moderationRestrictions)
    .where(eq(moderationRestrictions.discordUserId, identity.id));
  await globalThis.polycordSql.end();
}
