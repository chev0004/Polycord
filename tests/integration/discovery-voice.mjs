import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
process.env.POLYCORD_PREMIUM_USER_IDS = '';
mock.module('server-only', () => ({}));
const { db } = await import('../../src/db/client');
const { users, profiles, subscriptions, userBlocks, voiceIntros } =
  await import('../../src/db/schema');
const { countDiscovery, listDiscoveryPage } = await import(
  '../../src/db/discovery'
);
const { buildDiscoveryQuery, parseDiscoveryState } = await import(
  '../../src/features/Discovery/discoveryUrlState'
);
const { inArray } = await import('drizzle-orm');

const prefix = randomUUID().slice(0, 8);
const future = new Date(Date.now() + 86400000);
const past = new Date(Date.now() - 86400000);
const names = [
  'granted',
  'subscribed',
  'removed',
  'noDuration',
  'free',
  'expired',
  'boostedPlain',
  'blocker',
];
const owners = await db
  .insert(users)
  .values(
    names.map((name) => ({
      discordUserId: `${prefix}-${name}`,
      discordUsername: `${prefix}-${name}`,
      displayName: `Voice ${prefix} ${name}`,
      premiumGrantedUntil: ['granted', 'boostedPlain'].includes(name)
        ? future
        : name === 'expired'
          ? past
          : null,
    })),
  )
  .returning();
const owner = Object.fromEntries(
  names.map((name, index) => [name, owners[index]]),
);
const query = (params) =>
  parseDiscoveryState(new URLSearchParams([['tag', prefix], ...params]));
const load = (params, viewerUserId) =>
  listDiscoveryPage(query(params), 'en', {}, viewerUserId);
const ids = (page) => page.profiles.map((profile) => profile.displayName);
const named = (...entries) =>
  entries.map((name) => `Voice ${prefix} ${name}`).sort();

try {
  await db.insert(profiles).values(
    names.map((name) => ({
      userId: owner[name].id,
      isPublic: true,
      lastBumpedAt: new Date(),
      primaryLanguage: 'en',
      targetLanguage: 'fr',
      proficiencyLevel: 'beginner',
      bio: 'A safe isolated voice fixture.',
      tags: [prefix],
      voiceIntroSeconds: ['noDuration', 'boostedPlain', 'blocker'].includes(
        name,
      )
        ? null
        : 5,
      boostedUntil: name === 'boostedPlain' ? future : null,
    })),
  );
  await db.insert(subscriptions).values({
    userId: owner.subscribed.id,
    stripeCustomerId: `cus_${prefix}`,
    status: 'active',
    currentPeriodEnd: future,
  });
  await db.insert(voiceIntros).values(
    ['granted', 'subscribed', 'noDuration', 'free', 'expired'].map((name) => ({
      userId: owner[name].id,
      mimeType: 'audio/webm',
      durationSeconds: 5,
      sizeBytes: 3,
      data: 'AAAA',
    })),
  );

  const everyone = await load([]);
  assert.equal(everyone.total, names.length);

  const voice = await load([['voice', 'yes']]);
  assert.equal(voice.total, 2);
  assert.deepEqual(ids(voice).sort(), named('granted', 'subscribed'));
  assert.equal(await countDiscovery(query([['voice', 'yes']]), 'en', {}), 2);
  assert.deepEqual(
    ids(
      await load([
        ['voice', 'yes'],
        ['primary', 'fr'],
      ]),
    ),
    [],
  );
  assert.equal(
    (
      await load([
        ['voice', 'yes'],
        ['primary', 'en'],
      ])
    ).total,
    2,
  );

  const boosted = await load([['sort', 'name-asc']]);
  assert.ok(ids(boosted).includes(`Voice ${prefix} boostedPlain`));
  assert.ok(
    !ids(
      await load([
        ['voice', 'yes'],
        ['sort', 'name-asc'],
      ]),
    ).includes(`Voice ${prefix} boostedPlain`),
  );

  await db.insert(userBlocks).values({
    blockerUserId: owner.blocker.id,
    blockedUserId: owner.granted.id,
  });
  assert.deepEqual(
    ids(await load([['voice', 'yes']], owner.blocker.id)),
    named('subscribed'),
  );

  const state = query([['voice', 'yes']]);
  assert.equal(state.filterValues.voiceIntro, 'yes');
  assert.equal(
    parseDiscoveryState(new URLSearchParams(buildDiscoveryQuery(state)))
      .filterValues.voiceIntro,
    'yes',
  );

  console.log('discovery voice intro filter passed');
} finally {
  await db.delete(users).where(
    inArray(
      users.id,
      owners.map((entry) => entry.id),
    ),
  );
  await db.$client.end();
}
