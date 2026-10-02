import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
process.env.POLYCORD_PREMIUM_USER_IDS = '';
process.env.POLYCORD_ANALYTICS_DISABLED = 'true';
mock.module('server-only', () => ({}));
let currentUser = null;
mock.module('@/lib/auth', () => ({
  getActiveUser: async () => currentUser,
  getCurrentUser: async () => currentUser,
}));
const { db } = await import('../../src/db/client');
const { users } = await import('../../src/db/schema');
const { getProfileByDiscordUserId } = await import('../../src/db');
const { resolveDiscordCard } = await import('../../src/constants/discordCards');
const { POST } = await import('../../src/app/api/profile/route');
const { inArray } = await import('drizzle-orm');
const [member] = await db
  .insert(users)
  .values({
    discordUserId: randomUUID().replaceAll('-', ''),
    discordUsername: 'card-test',
    displayName: 'Card test',
  })
  .returning();
currentUser = {
  id: member.discordUserId,
  accountId: member.id,
  name: member.displayName,
  username: member.discordUsername,
};
const profileBody = {
  isPublic: true,
  allowAnonymousCopy: true,
  displayTimezone: true,
  displayAvailability: true,
  primaryLanguage: 'ja',
  targetLanguages: [{ language: 'en', level: 'intermediate' }],
  bio: 'An isolated discord card entitlement profile.',
  tags: [],
  country: 'JP',
  timezone: 'Asia/Tokyo',
};
const save = (extra) =>
  POST(
    new Request('http://localhost/api/profile', {
      method: 'POST',
      body: JSON.stringify({ ...profileBody, ...extra }),
    }),
  );
const stored = async () =>
  (await getProfileByDiscordUserId(member.discordUserId)).profile.discordCard;
try {
  assert.equal((await save({ discordCard: 'mirror' })).status, 200);
  assert.equal(await stored(), 'mirror');

  const rejected = await save({ discordCard: 'metal' });
  assert.equal(rejected.status, 400);
  assert.equal((await rejected.json()).issues[0].message, 'discordCardPremium');
  assert.equal((await save({ discordCard: 'unknown' })).status, 400);
  assert.equal(await stored(), 'mirror');

  assert.equal((await save({})).status, 200);
  assert.equal(await stored(), 'mirror');

  process.env.POLYCORD_PREMIUM_USER_IDS = member.discordUserId;
  assert.equal((await save({ discordCard: 'orbit' })).status, 200);
  assert.equal(await stored(), 'orbit');
  assert.equal(resolveDiscordCard(await stored(), true), 'orbit');

  process.env.POLYCORD_PREMIUM_USER_IDS = '';
  assert.equal(resolveDiscordCard(await stored(), false), 'classic');
  assert.equal((await save({ discordCard: 'orbit' })).status, 200);
  assert.equal((await save({})).status, 200);
  assert.equal(await stored(), 'orbit');
  assert.equal((await save({ discordCard: 'metal' })).status, 400);
  assert.equal(await stored(), 'orbit');
  assert.equal((await save({ discordCard: 'rank' })).status, 200);
  assert.equal(await stored(), 'rank');

  console.log('discord card entitlement passed');
} finally {
  await db.delete(users).where(inArray(users.id, [member.id]));
  process.exit(0);
}
