import { mock } from 'bun:test';
import assert from 'node:assert/strict';

mock.module('server-only', () => ({}));
mock.module('@/db/client', () => ({ scopedRoute: (handler) => handler }));

const visible = new Map([['111', { profile: { id: 'profile-1' } }]]);
const lookups = [];
mock.module('@/db', () => ({
  getPublicProfileByDiscordUserId: async (discordUserId) => {
    lookups.push(discordUserId);
    return visible.get(discordUserId) ?? null;
  },
}));
mock.module('@/lib/discordCard', () => ({
  discordCardImagePath: (row) =>
    `/api/discord-card/${row.profile.id}/v1/29999999.gif`,
}));

process.env.POLYCORD_BOT_KEY = 'bot-test-key';
const { GET } = await import('../../src/app/api/bot/profile-card/route');

const call = (query, authorization = 'Bearer bot-test-key') =>
  GET(
    new Request(`http://localhost:3000/api/bot/profile-card${query}`, {
      headers: authorization ? { authorization } : {},
    }),
  );

for (const authorization of [null, 'Bearer wrong']) {
  const response = await call('?discordUserId=111', authorization);
  assert.equal(response.status, 401);
}
assert.deepEqual(lookups, []);

for (const query of ['', '?discordUserId=', '?discordUserId=abc']) {
  const response = await call(query);
  assert.equal(response.status, 400, query);
  assert.equal(response.headers.get('cache-control'), 'no-store');
}

const missing = await call('?discordUserId=222');
assert.equal(missing.status, 404);
assert.equal(missing.headers.get('cache-control'), 'no-store');

const found = await call('?discordUserId=111');
assert.equal(found.status, 200);
assert.equal(found.headers.get('cache-control'), 'no-store');
assert.deepEqual(await found.json(), {
  profilePath: '/u/profile-1',
  cardPath: '/api/discord-card/profile-1/v1/29999999.gif',
});
assert.deepEqual(lookups, ['222', '111']);

console.log('bot profile card passed');
