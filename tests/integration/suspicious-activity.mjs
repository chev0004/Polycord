import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
mock.module('server-only', () => ({}));
const { db } = await import('../../src/db/client');
const { users, suspiciousActivity, moderationActions } = await import(
  '../../src/db/schema'
);
const { listSuspiciousGroups, listSuspiciousEvents } = await import(
  '../../src/db/rateLimits'
);
const { listModerationActionsPage } = await import('../../src/db/moderation');
const { ACTIVITY_PAGE_SIZE, pageOf } = await import(
  '../../src/lib/activityWindow'
);
const { eq, inArray } = await import('drizzle-orm');

const dayStart = Date.UTC(2031, 2, 10);
const at = (day, minutes) =>
  new Date(dayStart + day * 86400000 + minutes * 60000);
const windowOf = (day, cursor) => ({
  from: at(day, 0),
  to: at(day + 1, 0),
  cursor,
});
const parse = (cursor) => {
  const [at, id] = cursor.split('|');
  return { at, id };
};
const idsOf = (rows) => rows.map((row) => row.userId ?? row.id);

const prefix = randomUUID().slice(0, 8);
const named = ['heavy', 'light', 'single', 'yesterday'];
const crowd = Array.from({ length: ACTIVITY_PAGE_SIZE + 5 }, (_, i) => `c${i}`);
const accounts = await db
  .insert(users)
  .values(
    [...named, ...crowd].map((name) => ({
      discordUserId: `${prefix}-${name}`,
      discordUsername: `${prefix}-${name}`,
      displayName: `${prefix} ${name}`,
    })),
  )
  .returning();
const byName = Object.fromEntries(
  accounts.map((row, index) => [[...named, ...crowd][index], row]),
);
const anonymousIp = `192.0.2.${Math.floor(Math.random() * 250) + 1}`;
const event = (user, action, createdAt, ip = '203.0.113.5') => ({
  userId: user?.id ?? null,
  action,
  ip,
  createdAt,
});

try {
  await db
    .insert(suspiciousActivity)
    .values([
      ...Array.from({ length: 12 }, (_, index) =>
        event(byName.heavy, 'copy', at(0, 600 + index)),
      ),
      event(byName.light, 'report', at(0, 300), '198.51.100.2'),
      event(byName.light, 'bump', at(0, 400), '198.51.100.3'),
      event(byName.single, 'auth-failure', at(0, 200)),
      event(null, 'bump', at(0, 500), anonymousIp),
      event(byName.yesterday, 'copy', at(-1, 1439)),
      event(byName.single, 'copy', at(0, 0)),
      event(byName.single, 'copy', at(1, 0)),
    ]);

  const day = await listSuspiciousGroups(windowOf(0));
  const ours = day.filter(
    (row) => !row.userId || accounts.some(({ id }) => id === row.userId),
  );
  assert.deepEqual(
    ours.filter((row) => row.userId).map((row) => [row.userId, row.total]),
    [
      [byName.heavy.id, 12],
      [byName.light.id, 2],
      [byName.single.id, 2],
    ],
  );
  assert.equal(ours[0].action, 'copy');
  assert.equal(
    ours.find((row) => row.userId === byName.light.id).ip,
    '198.51.100.3',
  );
  assert.ok(ours.some((row) => !row.userId && row.ip === anonymousIp));
  assert.ok(!ours.some((row) => row.userId === byName.yesterday.id));

  const { events, hasMore } = await listSuspiciousEvents(
    byName.heavy.id,
    windowOf(0),
  );
  assert.equal(events.length, 12);
  assert.equal(hasMore, false);
  assert.ok(events.every((row) => row.action === 'copy'));
  assert.deepEqual(
    events.map((row) => row.createdAt.getTime()),
    [...events.map((row) => row.createdAt.getTime())].sort((a, b) => b - a),
  );

  const pages = [];
  for (let offset = 0, more = true; more; offset += 5) {
    const page = await listSuspiciousEvents(
      byName.heavy.id,
      windowOf(0),
      offset,
      5,
    );
    pages.push(page);
    more = page.hasMore;
  }
  assert.deepEqual(
    pages.map((page) => [page.events.length, page.hasMore]),
    [
      [5, true],
      [5, true],
      [2, false],
    ],
  );
  assert.deepEqual(
    pages.flatMap((page) => page.events.map((row) => row.id)),
    events.map((row) => row.id),
  );

  const earlier = await listSuspiciousGroups(windowOf(-1));
  assert.ok(earlier.some((row) => row.userId === byName.yesterday.id));

  assert.equal(
    (await listSuspiciousEvents(byName.single.id, windowOf(0))).events.length,
    2,
  );
  assert.equal(
    (await listSuspiciousEvents(byName.single.id, windowOf(1))).events.length,
    1,
  );

  const tied = at(2, 100);
  await db
    .insert(suspiciousActivity)
    .values(crowd.map((name) => event(byName[name], 'copy', tied)));
  const first = pageOf(await listSuspiciousGroups(windowOf(2)));
  assert.equal(first.page.length, ACTIVITY_PAGE_SIZE);
  assert.ok(first.nextCursor);
  await db
    .insert(suspiciousActivity)
    .values(event(byName.heavy, 'copy', at(2, 900)));
  const second = pageOf(
    await listSuspiciousGroups(windowOf(2, parse(first.nextCursor))),
  );
  assert.equal(second.page.length, crowd.length - ACTIVITY_PAGE_SIZE);
  assert.equal(second.nextCursor, undefined);
  assert.equal(
    new Set([...idsOf(first.page), ...idsOf(second.page)]).size,
    crowd.length,
  );

  await db.insert(moderationActions).values(
    Array.from({ length: ACTIVITY_PAGE_SIZE + 5 }, () => ({
      action: 'warn',
      note: prefix,
      createdAt: at(3, 50),
    })),
  );
  const firstLog = pageOf(await listModerationActionsPage(windowOf(3)));
  assert.equal(firstLog.page.length, ACTIVITY_PAGE_SIZE);
  const secondLog = pageOf(
    await listModerationActionsPage(windowOf(3, parse(firstLog.nextCursor))),
  );
  assert.equal(secondLog.page.length, 5);
  assert.equal(
    new Set([...firstLog.page, ...secondLog.page].map((row) => row.id)).size,
    ACTIVITY_PAGE_SIZE + 5,
  );
  assert.equal((await listModerationActionsPage(windowOf(4))).length, 0);

  console.log('suspicious activity grouping passed');
} finally {
  await db
    .delete(suspiciousActivity)
    .where(eq(suspiciousActivity.ip, anonymousIp));
  await db.delete(suspiciousActivity).where(
    inArray(
      suspiciousActivity.userId,
      accounts.map(({ id }) => id),
    ),
  );
  await db.delete(moderationActions).where(eq(moderationActions.note, prefix));
  await db.delete(users).where(
    inArray(
      users.id,
      accounts.map(({ id }) => id),
    ),
  );
  process.exit(0);
}
