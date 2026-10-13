import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
process.env.POLYCORD_PREMIUM_USER_IDS = '';
mock.module('server-only', () => ({}));
const { db } = await import('../../src/db/client');
const { users, profiles, userBlocks } = await import('../../src/db/schema');
const { suggestTags } = await import('../../src/db/discovery');
const { inArray } = await import('drizzle-orm');

const prefix = randomUUID().slice(0, 6);
const tag = (name) => `${prefix}${name}`;
const owners = await db
  .insert(users)
  .values(
    Array.from({ length: 12 }, (_, index) => ({
      discordUserId: `${prefix}-${index}`,
      discordUsername: `${prefix}-${index}`,
      displayName: `Suggest ${prefix} ${index}`,
    })),
  )
  .returning();
const viewer = owners[0];
const blocked = owners[1];
const hidden = owners[2];
const listed = owners.slice(3);

const profile = (owner, tags, overrides = {}) => ({
  userId: owner.id,
  isPublic: true,
  lastBumpedAt: new Date(),
  primaryLanguage: 'en',
  targetLanguage: 'fr',
  proficiencyLevel: 'beginner',
  bio: 'A safe isolated suggestion fixture.',
  tags,
  ...overrides,
});
const names = (rows) => rows.map(({ tag: name }) => name);

try {
  await db
    .insert(profiles)
    .values([
      profile(viewer, [tag('Viewer')]),
      profile(blocked, [tag('Blocked'), tag('Rugby')]),
      profile(hidden, [tag('Hidden')], { isPublic: false }),
      ...listed.map((owner, index) =>
        profile(owner, [
          tag('Rugby'),
          ...(index < 5 ? [tag('Running')] : []),
          ...(index < 3 ? [tag('Ruby')] : []),
          ...(index === 0 ? [tag('Ru'), tag('100%')] : []),
          ...(index === 1 ? [tag('rugby')] : []),
        ]),
      ),
    ]);
  await db
    .insert(userBlocks)
    .values({ blockerUserId: viewer.id, blockedUserId: blocked.id });

  const popular = await suggestTags(viewer.id, '', []);
  assert.ok(popular.length <= 5);
  assert.ok(
    popular.every(
      (entry, index) => index === 0 || popular[index - 1].count >= entry.count,
    ),
  );
  assert.ok(!names(popular).includes(tag('Blocked')));
  assert.ok(!names(popular).includes(tag('Hidden')));

  const withoutTop = await suggestTags(viewer.id, '', [
    popular[0].tag.toUpperCase(),
  ]);
  assert.ok(!names(withoutTop).includes(popular[0].tag));

  const search = await suggestTags(viewer.id, prefix.toUpperCase(), []);
  assert.deepEqual(names(search).slice(0, 3), [
    tag('Rugby'),
    tag('Running'),
    tag('Ruby'),
  ]);
  assert.equal(search[0].count, 9);
  assert.deepEqual(
    new Set(names(search)),
    new Set([
      tag('Rugby'),
      tag('Running'),
      tag('Ruby'),
      tag('100%'),
      tag('Ru'),
      tag('rugby'),
      tag('Viewer'),
    ]),
  );

  const exact = await suggestTags(viewer.id, tag('ru'), []);
  assert.equal(exact[0].tag, tag('Ru'));

  const caseInsensitive = await suggestTags(viewer.id, tag('RUGBY'), []);
  assert.deepEqual(names(caseInsensitive), [tag('Rugby'), tag('rugby')]);

  const excluded = await suggestTags(viewer.id, tag('ru'), [tag('RUGBY')]);
  assert.deepEqual(names(excluded), [tag('Ru'), tag('Running'), tag('Ruby')]);

  assert.deepEqual(names(await suggestTags(viewer.id, tag('Ru%'), [])), []);
  assert.deepEqual(names(await suggestTags(viewer.id, tag('R_'), [])), []);
  assert.deepEqual(names(await suggestTags(viewer.id, tag('100%'), [])), [
    tag('100%'),
  ]);
  assert.deepEqual(names(await suggestTags(viewer.id, tag('Hidden'), [])), []);
  assert.deepEqual(names(await suggestTags(viewer.id, tag('Blocked'), [])), []);

  console.log('discovery tag suggestions passed');
} finally {
  await db.delete(users).where(
    inArray(
      users.id,
      owners.map((owner) => owner.id),
    ),
  );
  await db.$client.end();
}
