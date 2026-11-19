import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
process.env.POLYCORD_PREMIUM_USER_IDS = '';
mock.module('server-only', () => ({}));
const { db } = await import('../../src/db/client');
const { users, profiles, profileTargetLanguages } = await import(
  '../../src/db/schema'
);
const { listDiscoveryPage, suggestTags } = await import(
  '../../src/db/discovery'
);
const { parseDiscoveryState } = await import(
  '../../src/features/Discovery/discoveryUrlState'
);
const { eq, inArray } = await import('drizzle-orm');

const prefix = randomUUID().slice(0, 8);
const tags = Array.from({ length: 8 }, (_, index) => `${prefix}t${index}`);
const languages = ['fr', 'de', 'es', 'it', 'pt'];
const future = new Date(Date.now() + 86400000);
const past = new Date(Date.now() - 86400000);
const owners = await db
  .insert(users)
  .values(
    ['lapsed', 'granted'].map((name) => ({
      discordUserId: `${prefix}-${name}`,
      discordUsername: `${prefix}-${name}`,
      displayName: `Limits ${prefix} ${name}`,
      premiumGrantedUntil: name === 'granted' ? future : past,
    })),
  )
  .returning();
const [lapsed, granted] = owners;
const load = (params) =>
  listDiscoveryPage(
    parseDiscoveryState(new URLSearchParams([['q', prefix], ...params])),
    'en',
    {},
  );
const names = (page) => page.profiles.map(({ displayName }) => displayName);
const named = (...entries) =>
  entries.map((name) => `Limits ${prefix} ${name}`).sort();

try {
  const inserted = await db
    .insert(profiles)
    .values(
      owners.map((owner) => ({
        userId: owner.id,
        isPublic: true,
        lastBumpedAt: new Date(),
        primaryLanguage: 'ja',
        targetLanguage: 'fr',
        proficiencyLevel: 'beginner',
        bio: `A safe isolated limits fixture ${prefix}.`,
        tags,
      })),
    )
    .returning();
  await db.insert(profileTargetLanguages).values(
    inserted.flatMap((profile) =>
      languages.map((language, position) => ({
        profileId: profile.id,
        language,
        proficiencyLevel: 'beginner',
        position,
      })),
    ),
  );

  const everyone = await load([]);
  const card = (name) =>
    everyone.profiles.find(
      ({ displayName }) => displayName === `Limits ${prefix} ${name}`,
    );
  assert.deepEqual(card('lapsed').tags, tags.slice(0, 5));
  assert.deepEqual(
    card('lapsed').targetLanguages.map(({ language }) => language),
    ['fr', 'de'],
  );
  assert.deepEqual(card('granted').tags, tags);
  assert.equal(card('granted').targetLanguages.length, 5);

  assert.deepEqual(
    names(await load([['tag', tags[4]]])).sort(),
    named('granted', 'lapsed'),
  );
  assert.deepEqual(names(await load([['tag', tags[6]]])), named('granted'));
  assert.deepEqual(
    names(await load([['target', 'de']])).sort(),
    named('granted', 'lapsed'),
  );
  assert.deepEqual(names(await load([['target', 'es']])), named('granted'));
  assert.deepEqual(
    names(
      await listDiscoveryPage(
        parseDiscoveryState(new URLSearchParams([['q', tags[7]]])),
        'en',
        {},
      ),
    ),
    named('granted'),
  );
  assert.deepEqual(
    names(
      await listDiscoveryPage(
        parseDiscoveryState(
          new URLSearchParams([
            ['q', 'spanish'],
            ['tag', tags[0]],
          ]),
        ),
        'en',
        {},
      ),
    ),
    named('granted'),
  );
  const counts = Object.fromEntries(
    (await suggestTags(randomUUID(), prefix, [])).map(({ tag, count }) => [
      tag,
      count,
    ]),
  );
  assert.equal(counts[tags[0]], 2);
  assert.equal(counts[tags[7]], 1);

  await db
    .update(users)
    .set({ premiumGrantedUntil: future })
    .where(eq(users.id, lapsed.id));
  assert.deepEqual(
    names(await load([['tag', tags[6]]])).sort(),
    named('granted', 'lapsed'),
  );
  assert.equal(
    (await load([])).profiles.find(({ displayName }) =>
      displayName.endsWith('lapsed'),
    ).tags.length,
    8,
  );

  console.log('discovery free limits passed');
} finally {
  await db.delete(users).where(
    inArray(
      users.id,
      owners.map((owner) => owner.id),
    ),
  );
  await db.$client.end();
}
