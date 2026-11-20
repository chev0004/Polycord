import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
process.env.AUTH_SECRET = 'isolated-security-test';
process.env.POLYCORD_ANALYTICS_DISABLED = 'true';
mock.module('server-only', () => ({}));
let cookie;
mock.module('next/headers', () => ({
  cookies: async () => ({ get: () => cookie && { value: cookie } }),
}));

const { db } = await import('../../src/db/client');
const schema = await import('../../src/db/schema');
const { eq, inArray } = await import('drizzle-orm');
const { upsertDiscordUser } = await import('../../src/db/profiles');
const { createReport } = await import('../../src/db/safety');
const { grantModerator, hasStaffRole } = await import(
  '../../src/db/moderation'
);
const { createSessionCookieValue } = await import('../../src/lib/auth-session');
const { POST: moderate } = await import(
  '../../src/app/api/admin/moderation/route'
);
const { POST: grantStaff } = await import(
  '../../src/app/api/admin/staff/route'
);
const { POST: grantPremium } = await import(
  '../../src/app/api/admin/premium/route'
);

const prefix = randomUUID().slice(0, 8);
const account = (name) =>
  upsertDiscordUser({ id: `${prefix}-${name}`, name: `${prefix} ${name}` });
const [owner, moderator, peer, member, reporter] = await Promise.all(
  ['owner', 'moderator', 'peer', 'member', 'reporter'].map(account),
);
const ids = [owner, moderator, peer, member, reporter].map(({ id }) => id);
process.env.POLYCORD_ADMIN_USER_IDS = owner.discordUserId;

const signIn = async (user) => {
  cookie = await createSessionCookieValue(
    { id: user.discordUserId, name: user.displayName },
    user.id,
  );
};
const post = (handler, body) =>
  handler(
    new Request('http://localhost/api/admin', {
      method: 'POST',
      headers: { origin: 'http://localhost', host: 'localhost' },
      body: JSON.stringify(body),
    }),
  );
const reportAgainst = async (target) =>
  (
    await createReport({
      reporterUserId: reporter.id,
      reportedUserId: target.id,
      reason: 'spam',
    })
  ).id;
const statusOf = async (reportId) =>
  (
    await db
      .select({ status: schema.reports.status })
      .from(schema.reports)
      .where(eq(schema.reports.id, reportId))
  )[0].status;
const dismiss = (target, reportId) =>
  post(moderate, {
    action: 'dismiss',
    userId: target.id,
    reportIds: [reportId],
  });

try {
  await grantModerator(moderator.id, owner.id);
  await grantModerator(peer.id, owner.id);
  const reportIds = {
    self: await reportAgainst(moderator),
    peer: await reportAgainst(peer),
    owner: await reportAgainst(owner),
    member: await reportAgainst(member),
  };

  await signIn(member);
  assert.equal((await dismiss(member, reportIds.member)).status, 404);
  assert.equal((await post(grantStaff, { userId: member.id })).status, 404);
  assert.equal(
    (await post(grantStaff, { discordId: member.discordUserId })).status,
    404,
  );
  assert.equal(await hasStaffRole(member.id), false);

  await signIn(moderator);
  for (const [target, reportId] of [
    [moderator, reportIds.self],
    [peer, reportIds.peer],
    [owner, reportIds.owner],
  ]) {
    assert.equal((await dismiss(target, reportId)).status, 403);
    assert.equal(await statusOf(reportId), 'pending');
  }
  assert.equal((await post(grantStaff, { userId: member.id })).status, 403);
  assert.equal(
    (
      await post(grantPremium, {
        userId: moderator.id,
        amount: 1,
        unit: 'years',
      })
    ).status,
    403,
  );
  assert.equal(await hasStaffRole(member.id), false);
  assert.equal((await dismiss(member, reportIds.member)).status, 200);
  assert.equal(await statusOf(reportIds.member), 'dismissed');

  await signIn(owner);
  assert.equal((await dismiss(moderator, reportIds.self)).status, 200);
  assert.equal(await statusOf(reportIds.self), 'dismissed');

  console.log('moderation privilege boundaries passed');
} finally {
  await db
    .delete(schema.moderationActions)
    .where(inArray(schema.moderationActions.adminUserId, ids));
  await db.delete(schema.users).where(inArray(schema.users.id, ids));
  await db.$client.end();
}
