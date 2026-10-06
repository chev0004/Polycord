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
const { listDiscoveryPage } = await import('../../src/db/discovery');
const { parseDiscoveryState } = await import(
  '../../src/features/Discovery/discoveryUrlState'
);
const { inArray } = await import('drizzle-orm');

const prefix = randomUUID().slice(0, 8);
const fill = Array.from({ length: 34 }, (_, index) => `${prefix}-f${index}`);
const cricket = `${prefix}-cricket`;
const rugby = `${prefix}-rugby`;
const owners = await db
  .insert(users)
  .values(
    Array.from({ length: 35 }, (_, index) => ({
      discordUserId: `${prefix}-${index}`,
      discordUsername: `${prefix}-${index}`,
      displayName: `Tags ${prefix} ${index}`,
    })),
  )
  .returning();
const load = (tags, viewerUserId) =>
  listDiscoveryPage(
    parseDiscoveryState(new URLSearchParams(tags.map((tag) => ['tag', tag]))),
    'en',
    {},
    viewerUserId,
  );
const names = (page) => page.tags.map(({ tag }) => tag);

try {
  await db.insert(profiles).values(
    owners.slice(0, 34).map((owner, index) => ({
      userId: owner.id,
      isPublic: true,
      lastBumpedAt: new Date(),
      primaryLanguage: 'en',
      targetLanguage: 'fr',
      proficiencyLevel: 'beginner',
      bio: 'A safe isolated tag fixture.',
      tags: [
        ...Array.from(
          { length: index < 2 ? 7 : 8 },
          (_, offset) => fill[(index + offset) % fill.length],
        ),
        ...(index === 0 ? [cricket] : []),
        ...(index === 1 ? [rugby] : []),
      ],
    })),
  );

  const plain = await load([]);
  assert.equal(plain.tags.length, 32);
  assert.ok(!names(plain).includes(cricket));

  const withCricket = await load([cricket]);
  assert.equal(withCricket.total, 1);
  assert.equal(withCricket.tags.length, 32);
  assert.deepEqual(
    withCricket.tags.find(({ tag }) => tag === cricket),
    { tag: cricket, count: 1 },
  );

  const both = await load([cricket, rugby]);
  assert.equal(both.tags.length, 32);
  assert.ok(names(both).includes(cricket) && names(both).includes(rugby));
  assert.equal(names(both).filter((tag) => fill.includes(tag)).length, 30);

  const popular = plain.tags[0].tag;
  const selectedPopular = await load([popular, cricket]);
  assert.ok(names(selectedPopular).includes(popular));
  assert.ok(names(selectedPopular).includes(cricket));
  assert.equal(selectedPopular.tags.length, 32);

  await db
    .insert(userBlocks)
    .values({ blockerUserId: owners[34].id, blockedUserId: owners[0].id });
  const blocked = await load([cricket], owners[34].id);
  assert.deepEqual(
    blocked.tags.find(({ tag }) => tag === cricket),
    { tag: cricket, count: 0 },
  );

  console.log('discovery selected tags passed');
} finally {
  await db.delete(users).where(
    inArray(
      users.id,
      owners.map((owner) => owner.id),
    ),
  );
  await db.$client.end();
}
