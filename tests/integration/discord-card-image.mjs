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
const { profiles, users } = await import('../../src/db/schema');
const { getProfileByDiscordUserId, getPublicProfileById } = await import(
  '../../src/db'
);
const { POST } = await import('../../src/app/api/profile/route');
const { GET } = await import('../../src/app/api/discord-card/[id]/route');
const { discordCardFor, discordCardImagePath } = await import(
  '../../src/lib/discordCard'
);
const { renderDiscordCardImage } = await import(
  '../../src/features/Profile/DiscordCard/image/render'
);
const { DISCORD_CARDS } = await import('../../src/constants/discordCards');
const { eq, inArray } = await import('drizzle-orm');
const { default: sharp } = await import('sharp');

const [member] = await db
  .insert(users)
  .values({
    discordUserId: randomUUID().replaceAll('-', ''),
    discordUsername: 'card-image-test',
    displayName: 'Card image test',
  })
  .returning();
currentUser = {
  id: member.discordUserId,
  accountId: member.id,
  name: member.displayName,
  username: member.discordUsername,
};
const save = (extra) =>
  POST(
    new Request('http://localhost/api/profile', {
      method: 'POST',
      body: JSON.stringify({
        isPublic: true,
        allowAnonymousCopy: true,
        displayTimezone: true,
        displayAvailability: true,
        primaryLanguage: 'ja',
        targetLanguages: [{ language: 'en', level: 'intermediate' }],
        bio: 'An isolated discord card image profile.',
        tags: ['Anime', 'Cooking'],
        country: 'JP',
        timezone: 'Asia/Tokyo',
        availability: { days: 'weekdays', from: '18:00', to: '22:00' },
        ...extra,
      }),
    }),
  );
const image = (id) =>
  GET(new Request(`http://localhost/api/discord-card/${id}`), {
    params: Promise.resolve({ id }),
  });
const assertAnimation = async (response) => {
  assert.equal(response.headers.get('content-type'), 'image/gif');
  const {
    width,
    height,
    pageHeight = height,
    delay,
    loop,
  } = await sharp(await response.arrayBuffer(), { pages: -1 }).metadata();
  assert.deepEqual([width, pageHeight, loop], [934, 320, 0]);
  assert.ok(delay.every((ms) => ms > 0 && ms % 40 === 0));
  return delay.reduce((sum, ms) => sum + ms, 0);
};
const row = async () =>
  getPublicProfileById(
    (await getProfileByDiscordUserId(member.discordUserId)).profile.id,
  );

try {
  process.env.POLYCORD_PREMIUM_USER_IDS = member.discordUserId;
  assert.equal((await save({ discordCard: 'metal' })).status, 200);
  const supporter = await row();
  assert.equal(discordCardFor(supporter).layout, 'metal');
  const supporterPath = discordCardImagePath(supporter);

  const response = await image(supporter.profile.id);
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get('cache-control'),
    'public, max-age=60, s-maxage=60',
  );
  assert.equal(await assertAnimation(response), 2800);
  for (const layout of DISCORD_CARDS)
    await assertAnimation(
      await renderDiscordCardImage({ ...discordCardFor(supporter), layout }),
    );

  process.env.POLYCORD_PREMIUM_USER_IDS = '';
  const ended = await row();
  assert.equal(discordCardFor(ended).layout, 'classic');
  assert.notEqual(discordCardImagePath(ended), supporterPath);

  const card = discordCardFor(ended).data;
  assert.equal(card.handle, '@card-image-test');
  assert.ok(card.time);
  assert.equal(card.availability.days, 'Weekdays');

  const before = discordCardImagePath(ended);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(
    (
      await save({
        discordCard: 'rank',
        allowAnonymousCopy: false,
        displayTimezone: false,
        displayAvailability: false,
      })
    ).status,
    200,
  );
  const hidden = await row();
  assert.notEqual(discordCardImagePath(hidden), before);
  assert.equal(discordCardFor(hidden).layout, 'rank');
  const shown = discordCardFor(hidden).data;
  assert.equal(shown.handle, '');
  assert.equal(shown.time, '');
  assert.equal(shown.availability, undefined);

  await db
    .update(profiles)
    .set({ isPublic: false })
    .where(eq(profiles.id, hidden.profile.id));
  assert.equal((await image(hidden.profile.id)).status, 404);
  assert.equal((await image(randomUUID())).status, 404);
  assert.equal((await image('not-a-profile')).status, 404);

  console.log('discord card image passed');
} finally {
  await db.delete(users).where(inArray(users.id, [member.id]));
  process.exit(0);
}
