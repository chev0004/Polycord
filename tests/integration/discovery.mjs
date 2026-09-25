import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
process.env.POLYCORD_PREMIUM_USER_IDS = '';
mock.module('server-only', () => ({}));
const { db } = await import('../../src/db/client');
const {
  users,
  profiles,
  profileTargetLanguages,
  savedProfiles,
  userBlocks,
  subscriptions,
} = await import('../../src/db/schema');
const { countDiscovery, listDiscoveryPage } = await import(
  '../../src/db/discovery'
);
const { listPublicProfilesByIds } = await import('../../src/db/profiles');
const { applyDiscoverySearch } = await import(
  '../../src/features/Discovery/discoverySearch'
);
const { isAvailableNow, overlapMinutes } = await import(
  '../../src/features/Discovery/availabilityOverlap'
);
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
    })),
  )
  .returning();
const viewer = {
  timezone: 'America/Chicago',
  availability: { days: 'weekdays', from: '18:00', to: '22:00' },
};
const load = (query = '', userId) =>
  listDiscoveryPage(
    parseDiscoveryState(new URLSearchParams(`tag=${prefix}&${query}`)),
    'en',
    viewer,
    userId,
  );
try {
  const items = await db
    .insert(profiles)
    .values(
      owners.map((owner, index) => ({
        userId: owner.id,
        isPublic: true,
        primaryLanguage: index % 2 ? 'en' : 'ja',
        targetLanguage: 'fr',
        proficiencyLevel: 'beginner',
        bio: 'A safe isolated discovery fixture.',
        tags: [prefix, 'Cooking'],
        country: 'US',
        timezone: 'America/Chicago',
        availabilityDays: 'weekdays',
        availabilityFrom: '18:00',
        availabilityTo: '22:00',
      })),
    )
    .returning();
  const first = await load('sort=name-asc');
  assert.equal(first.total, 30);
  assert.equal(first.profiles.length, 9);
  assert.equal(first.profiles[0].id, items[0].id);
  assert.equal((await load('page=999')).page, 4);
  assert.equal((await load('page=4')).profiles.length, 3);
  assert.equal((await load('primary=ja')).total, 15);
  assert.equal((await load('q=Japanese')).total, 15);
  for (const query of ['primary=ja', 'q=Japanese', 'q=japanese+a', 'q=ja']) {
    assert.equal(
      await countDiscovery(
        parseDiscoveryState(new URLSearchParams(`tag=${prefix}&${query}`)),
        'en',
        viewer,
      ),
      (await load(query)).total,
      query,
    );
  }
  assert.equal((await load('q=beginner')).total, 30);
  assert.equal((await load('q=a+safe+isolated+discovery+fixture')).total, 30);
  assert.equal((await load('target=fr&country=US&level=beginner')).total, 30);
  assert.equal((await load('avail=overlaps')).total, 30);
  assert.equal((await load('sort=overlap-desc')).profiles.length, 9);
  assert.equal((await load('avail=available-now')).total >= 0, true);
  await db
    .update(profiles)
    .set({ timezone: 'Mars/Olympus' })
    .where(eq(profiles.id, items[1].id));
  assert.equal((await load('avail=overlaps')).total, 29);
  await db
    .update(profiles)
    .set({ timezone: 'America/Chicago' })
    .where(eq(profiles.id, items[1].id));
  const username = `q=${encodeURIComponent(owners[17].discordUsername)}`;
  assert.equal((await load(username)).total, 1);
  await db
    .update(profiles)
    .set({ allowAnonymousCopy: false })
    .where(eq(profiles.id, items[17].id));
  assert.equal((await load(username)).total, 0);
  assert.equal((await load(username, owners[0].id)).total, 1);
  await db
    .update(profiles)
    .set({ allowAnonymousCopy: true })
    .where(eq(profiles.id, items[17].id));
  await db.insert(profileTargetLanguages).values({
    profileId: items[0].id,
    language: 'de',
    proficiencyLevel: 'advanced',
    position: 0,
  });
  assert.equal((await load('target=de&level=advanced')).total, 1);
  assert.equal((await load('level=advanced')).total, 1);
  assert.equal((await load('level=advanced&level=beginner')).total, 30);
  assert.equal((await load('target=fr')).total, 29);
  assert.equal((await load('level=invalid')).total, 0);
  const searchable = await listPublicProfilesByIds(
    items.map((item) => item.id),
  );
  for (const locale of ['en', 'ja']) {
    for (const query of [
      'French Beginner',
      'Japanese',
      '日本語',
      'America/Chicago',
      'GMT-5 (CDT)',
      'Cooking French',
      "'%_",
    ]) {
      const expected = applyDiscoverySearch(searchable, query, locale);
      const result = await listDiscoveryPage(
        parseDiscoveryState(new URLSearchParams({ tag: prefix, q: query })),
        locale,
        viewer,
      );
      assert.equal(result.total, expected.length, `${locale}: ${query}`);
    }
  }
  await db
    .update(profiles)
    .set({ displayTimezone: false })
    .where(eq(profiles.id, items[0].id));
  assert.equal((await load('avail=overlaps')).total, 29);
  assert.equal((await load('tz=America%2FChicago')).total, 29);
  await db
    .update(profiles)
    .set({ isPublic: false })
    .where(eq(profiles.id, items[1].id));
  await db
    .update(profiles)
    .set({ hiddenByModeration: true })
    .where(eq(profiles.id, items[2].id));
  await db
    .update(users)
    .set({ bannedAt: new Date() })
    .where(eq(users.id, owners[3].id));
  assert.equal((await load()).total, 27);
  await db.insert(userBlocks).values([
    { blockerUserId: owners[4].id, blockedUserId: owners[5].id },
    { blockerUserId: owners[6].id, blockedUserId: owners[4].id },
  ]);
  assert.equal((await load('', owners[4].id)).total, 25);
  assert.equal((await load()).total, 27);
  await db
    .insert(savedProfiles)
    .values({ userId: owners[4].id, profileId: items[7].id });
  assert.deepEqual(
    (await load('sort=name-asc', owners[4].id)).savedProfileIds,
    [items[7].id],
  );
  assert.deepEqual(
    (await load('sort=name-asc', owners[8].id)).savedProfileIds,
    [],
  );
  await db
    .update(profiles)
    .set({ boostedUntil: new Date(Date.now() + 3600000) })
    .where(eq(profiles.id, items[29].id));
  await db.insert(subscriptions).values({
    userId: owners[29].id,
    stripeCustomerId: prefix,
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 3600000),
  });
  assert.equal((await load()).profiles[0].id, items[29].id);
  await db
    .update(subscriptions)
    .set({ status: 'canceled' })
    .where(eq(subscriptions.userId, owners[29].id));
  assert.notEqual((await load()).profiles[0].id, items[29].id);
  for (const [index, pattern] of [
    {
      timezone: 'Asia/Tokyo',
      availabilityDays: 'weekends',
      availabilityFrom: '22:00',
      availabilityTo: '02:00',
    },
    {
      timezone: 'Pacific/Auckland',
      availabilityDays: 'any',
      availabilityAnyTime: true,
    },
    {
      timezone: 'America/New_York',
      availabilityDays: null,
      availability: 'weeknights',
    },
    {
      timezone: 'Europe/London',
      availabilityDays: null,
      availability: 'weekends',
    },
    {
      timezone: 'UTC',
      availabilityDays: null,
      availability: 'weekday_mornings',
    },
    {
      timezone: 'Asia/Kolkata',
      availabilityDays: 'any',
      availabilityFrom: '23:30',
      availabilityTo: '01:00',
    },
  ].entries()) {
    await db
      .update(profiles)
      .set(pattern)
      .where(eq(profiles.id, items[index + 8].id));
  }
  const candidates = await listPublicProfilesByIds(
    items.map((item) => item.id),
  );
  assert.equal(
    (await load('avail=overlaps')).total,
    candidates.filter(
      (candidate) =>
        candidate.timezone && overlapMinutes(viewer, candidate) >= 30,
    ).length,
  );
  assert.equal(
    (await load('avail=available-now')).total,
    candidates.filter(
      (candidate) => candidate.timezone && isAvailableNow(candidate),
    ).length,
  );
  console.log('discovery pagination, filters and privacy passed');
} finally {
  await db.delete(users).where(
    inArray(
      users.id,
      owners.map((owner) => owner.id),
    ),
  );
  await globalThis.polycordSql.end();
}
