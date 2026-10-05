import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
process.env.AUTH_SECRET = 'isolated-seed-test';
process.env.POLYCORD_ANALYTICS_DISABLED = 'true';
process.env.POLYCORD_PREMIUM_USER_IDS = '';
mock.module('server-only', () => ({}));
let cookie;
mock.module('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: cookie }) }),
}));

const { db } = await import('../../src/db/client');
const {
  users,
  profiles,
  profileTargetLanguages,
  savedProfiles,
  moderationRestrictions,
  notifications,
  seedDatabase,
  subscriptions,
  voiceIntros,
} = await import('../../src/db/schema');
const { eq, and, count, inArray, like } = await import('drizzle-orm');
const { upsertDiscordUser, upsertProfileForUser } = await import(
  '../../src/db/profiles'
);
const { listDiscoveryPage } = await import('../../src/db/discovery');
const { parseDiscoveryState } = await import(
  '../../src/features/Discovery/discoveryUrlState'
);
const { createSessionCookieValue } = await import('../../src/lib/auth-session');
const { generateDummy } = await import('../../src/lib/seed/generate');
const { readFile } = await import('node:fs/promises');
const voiceRoute = await import('../../src/app/api/voice/[profileId]/route');
const { SEED_CAP } = await import('../../src/lib/seed/limits');
const seedRoute = await import('../../src/app/api/admin/seed/route');
const { POST: copyUsername } = await import(
  '../../src/app/api/notifications/route'
);

const prefix = randomUUID().slice(0, 8);
const owner = { id: `${prefix}-owner`, name: 'Seed owner' };
const member = { id: `${prefix}-member`, name: 'Seed member' };
const realIdentities = Array.from({ length: 15 }, (_, index) => ({
  id: `${prefix}-real-${index}`,
  name: `Seed real ${index}`,
}));
const profileValues = {
  isPublic: true,
  allowAnonymousCopy: true,
  displayTimezone: true,
  displayAvailability: true,
  primaryLanguage: 'ja',
  targetLanguages: [{ language: 'en', level: 'beginner' }],
  bio: 'A real account that must survive dummy seeding.',
  tags: [],
  country: 'JP',
  timezone: 'Asia/Tokyo',
  availability: null,
};
const request = (body, origin = 'http://localhost') =>
  new Request('http://localhost/api/admin/seed', {
    method: 'POST',
    headers: { host: 'localhost', origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
const status = async () => {
  const response = await seedRoute.GET();
  return response.status === 200 ? response.json() : response.status;
};
const converge = async (target) => {
  let steps = 0;
  let current = await status();
  while (current.dummies !== target) {
    const before = current.dummies;
    const response = await seedRoute.POST(request({ target }));
    assert.equal(response.status, 200);
    current = await response.json();
    assert.ok(Math.abs(current.dummies - before) <= 2000);
    assert.notEqual(current.dummies, before);
    steps += 1;
  }
  return { current, steps };
};
const snapshotReal = async () =>
  db
    .select()
    .from(users)
    .where(eq(users.isSynthetic, false))
    .orderBy(users.discordUserId);
const setEnvironment = (values) => {
  for (const key of [
    'POLYCORD_SEED_ENABLED',
    'POLYCORD_ENVIRONMENT',
    'POLYCORD_PUBLIC_URL',
  ]) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
};

const ownerUser = await upsertDiscordUser(owner);
const memberUser = await upsertDiscordUser(member);
const realUsers = await Promise.all(realIdentities.map(upsertDiscordUser));
await Promise.all(
  [memberUser, ...realUsers].map((user) =>
    upsertProfileForUser(user.id, profileValues),
  ),
);
process.env.POLYCORD_ADMIN_USER_IDS = owner.id;
const ownerCookie = await createSessionCookieValue(owner, ownerUser.id);
const memberCookie = await createSessionCookieValue(member, memberUser.id);

try {
  assert.equal(
    (
      await db
        .select({ total: count() })
        .from(users)
        .where(eq(users.isSynthetic, true))
    )[0].total,
    0,
  );
  await db.delete(seedDatabase);
  cookie = ownerCookie;

  for (const environment of [
    {},
    { POLYCORD_ENVIRONMENT: 'local' },
    { POLYCORD_SEED_ENABLED: 'true' },
    { POLYCORD_SEED_ENABLED: 'true', POLYCORD_ENVIRONMENT: 'production' },
    { POLYCORD_SEED_ENABLED: 'true', POLYCORD_ENVIRONMENT: 'preview' },
    {
      POLYCORD_SEED_ENABLED: 'true',
      POLYCORD_ENVIRONMENT: 'staging',
      POLYCORD_PUBLIC_URL: 'https://polycord.app',
    },
  ]) {
    setEnvironment(environment);
    await db
      .insert(seedDatabase)
      .values({ label: 'Local Test Database' })
      .onConflictDoNothing();
    assert.equal(await status(), 404, JSON.stringify(environment));
    assert.equal(
      (await seedRoute.POST(request({ target: 10 }))).status,
      404,
      JSON.stringify(environment),
    );
  }

  setEnvironment({
    POLYCORD_SEED_ENABLED: 'true',
    POLYCORD_ENVIRONMENT: 'local',
  });
  await db.delete(seedDatabase);
  assert.equal(await status(), 404);
  assert.equal((await seedRoute.POST(request({ target: 10 }))).status, 404);
  assert.equal(
    (
      await db
        .select({ total: count() })
        .from(users)
        .where(eq(users.isSynthetic, true))
    )[0].total,
    0,
  );

  await db
    .insert(seedDatabase)
    .values({ label: 'Staging/Test Database', shared: true });
  cookie = memberCookie;
  assert.equal(await status(), 404);
  assert.equal((await seedRoute.POST(request({ target: 10 }))).status, 404);
  cookie = ownerCookie;

  const realBefore = await snapshotReal();
  const initial = await status();
  assert.equal(initial.dummies, 0);
  assert.equal(initial.real, realBefore.length);
  assert.equal(initial.label, 'Staging/Test Database');
  assert.equal(initial.shared, true);
  assert.equal(initial.cap, SEED_CAP);
  assert.equal(
    (await seedRoute.POST(request({ target: 10 }, 'https://evil.test'))).status,
    403,
  );
  assert.equal(
    (await seedRoute.POST(request({ target: SEED_CAP + 1 }))).status,
    400,
  );
  assert.equal((await seedRoute.POST(request({ target: -1 }))).status, 400);

  const state = parseDiscoveryState(new URLSearchParams());
  const baseline = await listDiscoveryPage(state, 'en', {});
  const [{ total: voiceBaseline }] = await db
    .select({ total: count() })
    .from(voiceIntros);
  const added = await converge(5000);
  assert.equal(added.steps, 3);
  assert.equal(added.current.real, realBefore.length);
  assert.deepEqual(await snapshotReal(), realBefore);
  const repeated = await seedRoute.POST(request({ target: 5000 }));
  assert.equal((await repeated.json()).dummies, 5000);
  const seeded = await db
    .select({ discordUserId: users.discordUserId })
    .from(users)
    .where(eq(users.isSynthetic, true));
  assert.equal(new Set(seeded.map((row) => row.discordUserId)).size, 5000);
  assert.ok(
    seeded.every(({ discordUserId }) => /^seed-\d{6}$/.test(discordUserId)),
  );
  assert.equal(
    (
      await db
        .select({ total: count() })
        .from(profileTargetLanguages)
        .innerJoin(profiles, eq(profiles.id, profileTargetLanguages.profileId))
        .innerJoin(users, eq(users.id, profiles.userId))
        .where(eq(users.isSynthetic, true))
    )[0].total,
    Array.from(
      { length: 5000 },
      (_, index) => generateDummy(index + 1, new Date()).targetLanguages.length,
    ).reduce((sum, length) => sum + length, 0),
  );

  const generated = Array.from({ length: 5000 }, (_, index) =>
    generateDummy(index + 1, new Date()),
  );
  const visible = generated.filter(
    ({ profile }) => profile.isPublic && !profile.hiddenByModeration,
  ).length;
  const syntheticRows = (table) =>
    db
      .select({ row: table, discordUserId: users.discordUserId })
      .from(table)
      .innerJoin(users, eq(users.id, table.userId))
      .where(eq(users.isSynthetic, true));
  const premiumRows = await syntheticRows(subscriptions);
  assert.deepEqual(
    premiumRows.map(({ discordUserId }) => discordUserId).sort(),
    generated
      .filter(({ premium }) => premium)
      .map(({ user }) => user.discordUserId)
      .sort(),
  );
  assert.ok(
    premiumRows.every(
      ({ row, discordUserId }) =>
        row.stripeCustomerId === discordUserId &&
        row.stripeSubscriptionId === null &&
        row.status === 'active' &&
        row.currentPeriodEnd > new Date(),
    ),
  );
  const voiceRows = await syntheticRows(voiceIntros);
  const voiced = generated.filter(({ voice }) => voice);
  assert.equal(voiceRows.length, voiced.length);
  const [spoken] = voiced.filter(
    ({ profile }) => profile.isPublic && !profile.hiddenByModeration,
  );
  const [spokenProfile] = await db
    .select({ id: profiles.id, seconds: profiles.voiceIntroSeconds })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(eq(users.discordUserId, spoken.user.discordUserId));
  assert.equal(spokenProfile.seconds, spoken.voice.seconds);
  cookie = undefined;
  const played = await voiceRoute.GET(
    new Request(`http://localhost/api/voice/${spokenProfile.id}`),
    { params: Promise.resolve({ profileId: spokenProfile.id }) },
  );
  assert.equal(played.status, 200);
  assert.equal(played.headers.get('content-type'), 'audio/webm');
  assert.ok(
    Buffer.from(await played.arrayBuffer()).equals(
      await readFile(
        new URL(
          `../../src/lib/seed/voices/${spoken.voice.file}`,
          import.meta.url,
        ),
      ),
    ),
  );
  cookie = ownerCookie;
  const premiumPage = await listDiscoveryPage(
    parseDiscoveryState(new URLSearchParams('q=' + spoken.user.displayName)),
    'en',
    {},
  );
  const spokenCard = premiumPage.profiles.find(
    ({ id }) => id === spokenProfile.id,
  );
  assert.equal(spokenCard.premium, true);
  assert.equal(spokenCard.voiceIntroSeconds, spoken.voice.seconds);
  const discovered = await listDiscoveryPage(state, 'en', {});
  assert.equal(discovered.total, baseline.total + visible);
  assert.equal(discovered.profiles[0].boosted, true);
  assert.equal(discovered.profiles[0].synthetic, true);
  const japanese = await listDiscoveryPage(
    parseDiscoveryState(new URLSearchParams('primary=ja&page=3')),
    'en',
    {},
  );
  assert.equal(japanese.page, 3);
  assert.ok(
    japanese.profiles.every(({ primaryLanguage }) => primaryLanguage === 'ja'),
  );
  const [hidden] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(and(eq(users.isSynthetic, true), eq(profiles.isPublic, false)))
    .limit(1);
  const search = await listDiscoveryPage(
    parseDiscoveryState(new URLSearchParams('q=patient partner')),
    'en',
    {},
  );
  assert.ok(search.total > 0);
  assert.ok(!search.profiles.some(({ id }) => id === hidden.id));

  const [dummy] = await db
    .select({ profileId: profiles.id, discordUserId: users.discordUserId })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(eq(users.discordUserId, 'seed-004999'));
  const [survivor] = await db
    .select({ profileId: profiles.id, userId: users.id })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(eq(users.discordUserId, 'seed-000500'));
  await db.insert(savedProfiles).values([
    { userId: memberUser.id, profileId: dummy.profileId },
    { userId: memberUser.id, profileId: survivor.profileId },
  ]);
  await db
    .insert(moderationRestrictions)
    .values({ discordUserId: dummy.discordUserId, hiddenByModeration: true });
  cookie = memberCookie;
  const copied = await copyUsername(
    new Request('http://localhost/api/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profileId: survivor.profileId }),
    }),
  );
  assert.equal((await copied.json()).created, false);
  assert.equal(
    (
      await db
        .select({ total: count() })
        .from(notifications)
        .where(eq(notifications.userId, survivor.userId))
    )[0].total,
    0,
  );
  cookie = ownerCookie;

  const reduced = await converge(1000);
  assert.equal(reduced.steps, 2);
  assert.deepEqual(await snapshotReal(), realBefore);
  const remaining = await db
    .select({ discordUserId: users.discordUserId })
    .from(users)
    .where(eq(users.isSynthetic, true))
    .orderBy(users.discordUserId);
  assert.equal(remaining.length, 1000);
  assert.equal(remaining.at(-1).discordUserId, 'seed-001000');
  assert.deepEqual(
    (
      await db
        .select({ profileId: savedProfiles.profileId })
        .from(savedProfiles)
        .where(eq(savedProfiles.userId, memberUser.id))
    ).map(({ profileId }) => profileId),
    [survivor.profileId],
  );
  assert.equal(
    (
      await db
        .select()
        .from(moderationRestrictions)
        .where(eq(moderationRestrictions.discordUserId, dummy.discordUserId))
    ).length,
    0,
  );

  const cleared = await converge(0);
  assert.equal(cleared.current.dummies, 0);
  assert.equal(
    (
      await db
        .select({ total: count() })
        .from(subscriptions)
        .where(like(subscriptions.stripeCustomerId, 'seed-%'))
    )[0].total,
    0,
  );
  assert.equal(
    (await db.select({ total: count() }).from(voiceIntros))[0].total,
    voiceBaseline,
  );
  assert.deepEqual(await snapshotReal(), realBefore);
  assert.equal(
    (
      await db
        .select({ total: count() })
        .from(profiles)
        .innerJoin(users, eq(users.id, profiles.userId))
        .where(like(users.discordUserId, 'seed-%'))
    )[0].total,
    0,
  );
  assert.equal(
    (
      await db
        .select({ total: count() })
        .from(savedProfiles)
        .where(eq(savedProfiles.userId, memberUser.id))
    )[0].total,
    0,
  );
  console.log('seed lifecycle passed');
} finally {
  await db.delete(users).where(eq(users.isSynthetic, true));
  await db
    .delete(moderationRestrictions)
    .where(like(moderationRestrictions.discordUserId, 'seed-%'));
  await db.delete(seedDatabase);
  await db.delete(users).where(
    inArray(
      users.id,
      [ownerUser, memberUser, ...realUsers].map((user) => user.id),
    ),
  );
  await db.$client.end();
}
