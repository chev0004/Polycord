import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-public';
process.env.VAPID_PRIVATE_KEY = 'test-private';
process.env.VAPID_SUBJECT = 'mailto:test@example.com';
mock.module('server-only', () => ({}));
const sent = [];
let expired = false;
class WebPushError extends Error {
  statusCode = 410;
}
const sender = {
  WebPushError,
  sendNotification: async (subscription, payload) => {
    if (expired) throw new WebPushError();
    sent.push({ subscription, payload });
  },
};
mock.module('web-push', () => ({ default: sender, ...sender }));
const { db } = await import('../../src/db/client');
const { users, userSettings } = await import('../../src/db/schema');
const {
  savePushSubscription,
  deletePushSubscriptionsForUser,
  listPushSubscriptionsForUser,
} = await import('../../src/db/push');
const { createNotification } = await import('../../src/db/notifications');
const { isPushEndpoint } = await import('../../src/lib/push/server');
const { eq } = await import('drizzle-orm');
const [user] = await db
  .insert(users)
  .values({
    discordUserId: randomUUID().slice(0, 32),
    discordUsername: 'push-test',
    displayName: 'Push test',
  })
  .returning();
try {
  const values = {
    endpoint: 'https://fcm.googleapis.com/test',
    p256dh: 'test',
    auth: 'test',
  };
  assert.equal(isPushEndpoint('http://127.0.0.1/private'), false);
  assert.equal(
    isPushEndpoint('https://fcm.googleapis.com.evil.example/test'),
    false,
  );
  await savePushSubscription(user.id, values);
  await createNotification({ userId: user.id, kind: 'copy', isGuest: true });
  assert.equal(sent.length, 1);
  await db
    .update(userSettings)
    .set({ profileInteractionAlert: false })
    .where(eq(userSettings.userId, user.id));
  await createNotification({ userId: user.id, kind: 'copy', isGuest: true });
  assert.equal(sent.length, 1);
  await deletePushSubscriptionsForUser(user.id);
  await createNotification({
    userId: user.id,
    kind: 'warning',
    isGuest: false,
  });
  assert.equal(sent.length, 1);
  await savePushSubscription(user.id, values);
  expired = true;
  await createNotification({
    userId: user.id,
    kind: 'warning',
    isGuest: false,
  });
  assert.equal((await listPushSubscriptionsForUser(user.id)).length, 0);
  console.log('push delivery passed');
} finally {
  await db.delete(users).where(eq(users.id, user.id));
  await globalThis.polycordSql.end();
}
