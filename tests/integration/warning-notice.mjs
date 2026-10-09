import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = '';
process.env.POLYCORD_PREMIUM_USER_IDS = '';
process.env.POLYCORD_ANALYTICS_DISABLED = 'true';
mock.module('server-only', () => ({}));
let currentUser = null;
mock.module('@/lib/auth', () => ({
  getActiveUser: async () => currentUser,
  getCurrentUser: async () => currentUser,
}));
const { db } = await import('../../src/db/client');
const { users } = await import('../../src/db/schema');
const { createNotification } = await import('../../src/db/notifications');
const { GET, PATCH, DELETE } = await import(
  '../../src/app/api/notifications/route'
);
const { inArray, sql } = await import('drizzle-orm');

const people = await db
  .insert(users)
  .values(
    Array.from({ length: 2 }, () => ({
      discordUserId: randomUUID().replaceAll('-', ''),
      discordUsername: 'warning-notice-test',
      displayName: 'Warned',
    })),
  )
  .returning();
const [member, other] = people;
const asUser = (user) => {
  currentUser = {
    id: user.discordUserId,
    accountId: user.id,
    name: user.displayName,
    username: user.discordUsername,
  };
};
const request = (method, body) =>
  new Request('http://localhost/api/notifications', {
    method,
    body: JSON.stringify(body),
  });
const stored = async () =>
  (await (await GET()).json()).notifications.reduce(
    (byId, row) => ({ ...byId, [row.id]: row }),
    {},
  );

try {
  const notice = await createNotification({
    userId: member.id,
    kind: 'warning',
    message: 'Harassment',
    warningCategory: 'harassment',
  });
  const custom = await createNotification({
    userId: member.id,
    kind: 'warning',
    message: 'A custom message',
  });
  const spam = await createNotification({
    userId: member.id,
    kind: 'warning',
    message: 'Spam',
    warningCategory: 'spam',
  });
  asUser(member);

  assert.deepEqual(
    (await (await GET()).json()).notifications.map((row) => row.id),
    [spam.id, custom.id, notice.id],
  );
  let rows = await stored();
  assert.equal(rows[notice.id].warningCategory, 'harassment');
  assert.equal(rows[notice.id].acknowledgedAt, undefined);
  assert.equal(rows[custom.id].warningCategory, undefined);

  assert.equal(
    (await PATCH(request('PATCH', { id: notice.id, read: true }))).status,
    200,
  );
  assert.equal((await stored())[notice.id].read, false);

  await PATCH(request('PATCH', { all: true }));
  rows = await stored();
  assert.equal(rows[notice.id].read, false);
  assert.equal(rows[custom.id].read, false);
  assert.equal(rows[spam.id].read, false);

  await DELETE(request('DELETE', { id: notice.id }));
  assert.ok((await stored())[notice.id]);
  await DELETE(request('DELETE', { all: true }));
  rows = await stored();
  assert.deepEqual(
    Object.keys(rows).sort(),
    [notice.id, custom.id, spam.id].sort(),
  );

  asUser(other);
  assert.equal(
    (await PATCH(request('PATCH', { id: notice.id, acknowledge: true })))
      .status,
    404,
  );
  asUser(member);
  assert.equal((await stored())[notice.id].acknowledgedAt, undefined);

  for (const pending of [custom, spam]) {
    assert.equal(
      (await PATCH(request('PATCH', { id: pending.id, acknowledge: true })))
        .status,
      200,
    );
    assert.ok((await stored())[pending.id].acknowledgedAt);
  }

  const acknowledged = await PATCH(
    request('PATCH', { id: notice.id, acknowledge: true }),
  );
  assert.equal(acknowledged.status, 200);
  const row = (await stored())[notice.id];
  assert.equal(row.read, true);
  assert.ok(Date.parse(row.acknowledgedAt) <= Date.now());

  assert.equal(
    (await PATCH(request('PATCH', { id: notice.id, acknowledge: true })))
      .status,
    404,
  );
  assert.equal((await stored())[notice.id].acknowledgedAt, row.acknowledgedAt);

  await PATCH(request('PATCH', { id: notice.id, read: false }));
  assert.equal((await stored())[notice.id].read, false);

  const legacy = await createNotification({
    userId: member.id,
    kind: 'warning',
    message: 'Stored before the category existed',
  });
  assert.equal((await stored())[legacy.id].acknowledgedAt, undefined);
  await db.execute(
    sql.raw(
      readFileSync('drizzle/0034_warning_notice_all.sql', 'utf8').replaceAll(
        '--> statement-breakpoint',
        '',
      ),
    ),
  );
  assert.ok((await stored())[legacy.id].acknowledgedAt);
  assert.equal((await stored())[spam.id].warningCategory, 'spam');

  await DELETE(request('DELETE', { all: true }));
  assert.deepEqual(await stored(), {});
  console.log('warning notice acknowledgement passed');
} finally {
  await db.delete(users).where(
    inArray(
      users.id,
      people.map(({ id }) => id),
    ),
  );
}
