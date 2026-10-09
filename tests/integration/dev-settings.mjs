import { expect, mock } from 'bun:test';

mock.module('server-only', () => ({}));
mock.module('@/db/client', () => ({ scopedRoute: (handler) => handler }));
const writes = [];
const devCookies = [];
let user;
mock.module('@/db', () => ({
  updateProfilePrivacyForUser: async () => true,
  updateUserEmail: async () => {},
  upsertUserSettings: async (_userId, values) => writes.push(values),
}));
mock.module('@/lib/auth', () => ({
  getActiveUser: async () => user,
  setDevCookie: (_response, toggles) => devCookies.push(toggles),
}));
mock.module('@/lib/admin', () => ({ isOwner: ({ id }) => id === 'owner' }));

const { POST } = await import('../../src/app/api/settings/route');

const settings = {
  isPublic: true,
  allowAnonymousCopy: true,
  displayTimezone: true,
  pushNotifications: false,
  profileInteractionAlert: true,
  profileViewAlert: false,
  hideProfileVisits: false,
  productAnalytics: true,
  applicationLanguage: 'en',
  timeFormat: '24hr',
  languageDisplay: 'long',
  email: 'user@example.com',
};
const save = (values) =>
  POST(
    new Request('http://localhost/api/settings', {
      method: 'POST',
      body: JSON.stringify({ ...settings, ...values }),
    }),
  );

user = { id: 'moderator', accountId: 'account-2' };
for (const values of [
  { loadTracing: true },
  { discoverySkeleton: false },
  { loadTracing: false, discoverySkeleton: false },
]) {
  expect((await save(values)).status).toBe(403);
}
expect(writes).toHaveLength(0);
expect((await save({})).status).toBe(200);
expect(writes).toHaveLength(1);
expect(devCookies).toHaveLength(0);

user = { id: 'owner', accountId: 'account-1' };
expect(
  (await save({ loadTracing: true, discoverySkeleton: false })).status,
).toBe(200);
expect(writes[1]).toMatchObject({
  loadTracing: true,
  discoverySkeleton: false,
});
expect(devCookies).toEqual([{ loadTracing: true, discoverySkeleton: false }]);

console.log('dev settings access passed');
