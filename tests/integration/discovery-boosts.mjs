import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
process.env.POLYCORD_PREMIUM_USER_IDS = '';
mock.module('server-only', () => ({}));
const { db } = await import('../../src/db/client');
const { users, profiles } = await import('../../src/db/schema');
const { listDiscoveryPage } = await import('../../src/db/discovery');
const { parseDiscoveryState } = await import(
  '../../src/features/Discovery/discoveryUrlState'
);
const { eq, inArray } = await import('drizzle-orm');
const prefix = randomUUID().slice(0, 8);
const owners = await db
  .insert(users)
  .values(
    Array.from({ length: 30 }, (_, index) => ({
      discordUserId: `${prefix}-${index}`,
      discordUsername: `${prefix}-${index}`,
      displayName: `Fixture ${prefix} ${String(index).padStart(2, '0')}`,
      isSynthetic: true,
    })),
  )
  .returning();
const now = Date.now();
const load = (query, stacked = false) =>
  listDiscoveryPage(
    parseDiscoveryState(new URLSearchParams(`tag=${prefix}&${query}`)),
    'en',
    {},
    undefined,
    stacked,
  );
try {
  const items = await db
    .insert(profiles)
    .values(
      owners.map((owner, index) => ({
        userId: owner.id,
        isPublic: true,
        lastBumpedAt: new Date(now - index * 60000),
        primaryLanguage: 'en',
        targetLanguage: 'fr',
        proficiencyLevel: 'beginner',
        bio: 'A safe isolated discovery fixture.',
        tags: [prefix],
        country: 'US',
      })),
    )
    .returning();
  const boost = (index, hours) =>
    db
      .update(profiles)
      .set({ boostedUntil: new Date(now + hours * 3600000) })
      .where(eq(profiles.id, items[index].id));
  for (const [index, hours] of [
    [20, 6],
    [19, 5],
    [18, 4],
    [17, 3],
    [16, 2],
    [0, 1],
  ])
    await boost(index, hours);
  const ids = async (query, stacked) =>
    (await load(query, stacked)).profiles.map((profile) => profile.id);
  const at = (...indexes) => indexes.map((index) => items[index].id);
  for (const search of ['', '&q=Fixture']) {
    assert.deepEqual(
      await ids(`page=1${search}`),
      at(20, 19, 18, 0, 1, 2, 3, 4, 5),
    );
    assert.deepEqual(
      await ids(`page=2${search}`),
      at(17, 16, 0, 6, 7, 8, 9, 10, 11),
    );
    assert.deepEqual(
      await ids(`page=3${search}`),
      at(12, 13, 14, 15, 16, 17, 18, 19, 20),
    );
    assert.deepEqual(
      await ids(`page=4${search}`),
      at(21, 22, 23, 24, 25, 26, 27, 28, 29),
    );
    assert.deepEqual(await ids(`page=2${search}`, true), [
      ...at(20, 19, 18, 0, 1, 2, 3, 4, 5),
      ...at(17, 16, 0, 6, 7, 8, 9, 10, 11),
    ]);
  }
  const first = await load('page=1');
  assert.equal(first.total, 30);
  assert.deepEqual(first.groupSizes, [9, 9, 9, 9]);
  assert.equal((await load('page=999')).page, 4);
  assert.deepEqual(
    await ids('page=1&sort=name-asc'),
    at(0, 1, 2, 3, 4, 5, 6, 7, 8),
  );
  await boost(17, -1);
  await boost(16, -1);
  assert.deepEqual(await ids('page=2'), at(0, 6, 7, 8, 9, 10, 11, 12, 13));
  assert.deepEqual(await ids('page=3'), at(14, 15, 16, 17, 18, 19, 20, 21, 22));
  assert.deepEqual((await load('page=1')).groupSizes, [9, 9, 9, 7]);
  await db
    .update(profiles)
    .set({ boostedUntil: null })
    .where(
      inArray(
        profiles.id,
        items.map((item) => item.id),
      ),
    );
  assert.deepEqual(await ids('page=1'), at(0, 1, 2, 3, 4, 5, 6, 7, 8));
  assert.deepEqual((await load('page=1')).groupSizes, [9, 9, 9, 3]);
  for (const [index, hours] of [
    [0, 9],
    [19, 8],
    [18, 7],
  ])
    await boost(index, hours);
  for (const search of ['', '&q=Fixture']) {
    assert.deepEqual(
      await ids(`page=1${search}`),
      at(0, 19, 18, 1, 2, 3, 4, 5, 6),
    );
    assert.deepEqual(
      await ids(`page=2${search}`),
      at(7, 8, 9, 10, 11, 12, 13, 14, 15),
    );
    assert.deepEqual(await ids(`page=4${search}`), at(25, 26, 27, 28, 29));
    assert.deepEqual(await ids(`page=2${search}`, true), [
      ...at(0, 19, 18, 1, 2, 3, 4, 5, 6),
      ...at(7, 8, 9, 10, 11, 12, 13, 14, 15),
    ]);
  }
  assert.deepEqual((await load('page=1')).groupSizes, [9, 9, 9, 5]);
  await db
    .update(profiles)
    .set({ boostedUntil: null })
    .where(
      inArray(
        profiles.id,
        items.map((item) => item.id),
      ),
    );
  await db
    .update(profiles)
    .set({ tags: [`${prefix}b`] })
    .where(
      inArray(
        profiles.id,
        items.slice(0, 9).map((item) => item.id),
      ),
    );
  for (let index = 0; index < 9; index++) await boost(index, 9 - index);
  const loadAll = (page, stacked) =>
    listDiscoveryPage(
      parseDiscoveryState(new URLSearchParams(`tag=${prefix}b&page=${page}`)),
      'en',
      {},
      undefined,
      stacked,
    );
  const sizes = [];
  for (const page of [1, 2, 3, 4])
    sizes.push((await loadAll(page)).profiles.length);
  assert.deepEqual(sizes, [9, 3, 3, 3]);
  assert.deepEqual((await loadAll(1)).groupSizes, [9, 3, 3]);
  assert.equal((await loadAll(3)).page, 3);
  assert.equal((await loadAll(4)).page, 3);
  assert.deepEqual(
    (await loadAll(3)).profiles.map((profile) => profile.id),
    at(6, 7, 8),
  );
  assert.equal((await loadAll(3, true)).profiles.length, 15);
  console.log('discovery boost interleaving passed');
} finally {
  await db.delete(users).where(
    inArray(
      users.id,
      owners.map((owner) => owner.id),
    ),
  );
  await db.$client.end();
}
