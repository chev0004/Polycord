import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
process.env.DATABASE_URL = url.href;
process.env.AUTH_SECRET = 'isolated-account-test';
process.env.POLYCORD_ANALYTICS_DISABLED = 'true';
mock.module('server-only', () => ({}));
let cookie;
mock.module('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: cookie }) }),
}));

const { db } = await import('../../src/db/client');
const schema = await import('../../src/db/schema');
const { eq, inArray } = await import('drizzle-orm');
const { upsertDiscordUser, upsertProfileForUser, getUserByDiscordId } =
  await import('../../src/db/profiles');
const { getAccountExportByUserId, deleteAccountByUserId } = await import(
  '../../src/db/account'
);
const { createSessionCookieValue, createOAuthStateCookieValue } = await import(
  '../../src/lib/auth-session'
);
const { getCurrentUser, getActiveUser } = await import('../../src/lib/auth');
const { DELETE: deleteAccount } = await import(
  '../../src/app/api/account/route'
);
const { GET: exportAccount } = await import(
  '../../src/app/api/account/export/route'
);
const identity = {
  id: randomUUID().replaceAll('-', ''),
  name: 'Account export test',
};
let user = await upsertDiscordUser(identity);
const other = await upsertDiscordUser({
  id: randomUUID().replaceAll('-', ''),
  name: 'Confidential identity',
});
const originalId = user.id;
const settings = {
  theme: 'light',
  applicationLanguage: 'ja',
  timeFormat: '12hr',
  hideProfileVisits: true,
};
const profileValues = {
  isPublic: true,
  allowAnonymousCopy: false,
  displayAvailability: true,
  displayTimezone: false,
  primaryLanguage: 'en',
  targetLanguages: [
    { language: 'ja', level: 'beginner' },
    { language: 'fr', level: 'advanced' },
  ],
  bio: 'A profile for isolated account export checks.',
  availability: null,
  tags: ['Cooking'],
  cardColor: 'custom',
  customGradientFrom: '#123456',
  customGradientTo: '#654321',
  accentOverride: '#abcdef',
  timezone: 'Asia/Tokyo',
};
const retainedIds = {};
try {
  const profile = await upsertProfileForUser(user.id, profileValues);
  const otherProfile = await upsertProfileForUser(other.id, profileValues);
  await db.insert(schema.userSettings).values({ userId: user.id, ...settings });
  await db.insert(schema.voiceIntros).values({
    userId: user.id,
    mimeType: 'audio/webm',
    durationSeconds: 3,
    sizeBytes: 4,
    data: 'dGVzdA==',
  });
  await db.insert(schema.savedProfiles).values([
    { userId: user.id, profileId: otherProfile.id },
    { userId: other.id, profileId: profile.id },
  ]);
  await db
    .insert(schema.userBlocks)
    .values({ blockerUserId: user.id, blockedUserId: other.id });
  const [report] = await db
    .insert(schema.reports)
    .values({
      reporterUserId: user.id,
      reportedUserId: other.id,
      reportedProfileId: otherProfile.id,
      reason: 'spam',
      details: 'My submitted report',
    })
    .returning();
  await db.insert(schema.reports).values({
    reporterUserId: other.id,
    reportedUserId: user.id,
    reason: 'other',
    details: 'Confidential report against me',
  });
  await db.insert(schema.notifications).values({
    userId: user.id,
    kind: 'copy',
    actorName: 'Confidential identity',
  });
  const [otherInbox] = await db
    .insert(schema.notifications)
    .values({ userId: other.id, kind: 'copy', actorName: identity.name })
    .returning();
  await db.insert(schema.subscriptions).values({
    userId: user.id,
    stripeCustomerId: `cus_${randomUUID()}`,
    stripeSubscriptionId: 'sub_isolated',
    status: 'canceled',
  });
  await db.insert(schema.profileBoosts).values({ userId: user.id });
  await db.insert(schema.pushSubscriptions).values({
    userId: user.id,
    endpoint: `https://example.com/${randomUUID()}`,
    p256dh: 'secret-delivery-key',
    auth: 'secret-delivery-auth',
  });
  const [event] = await db
    .insert(schema.analyticsEvents)
    .values({
      userId: user.id,
      name: 'profile_view',
      metadata: { ownerUserId: other.id },
      anonymousId: 'retained-anonymous-id',
    })
    .returning();
  const [moderation] = await db
    .insert(schema.moderationActions)
    .values({
      adminUserId: other.id,
      targetUserId: user.id,
      reportId: report.id,
      action: 'warn',
      note: 'Confidential moderation note',
    })
    .returning();
  const [suspicious] = await db
    .insert(schema.suspiciousActivity)
    .values({ userId: user.id, action: 'copy', ip: '192.0.2.1' })
    .returning();
  Object.assign(retainedIds, {
    event: event.id,
    moderation: moderation.id,
    suspicious: suspicious.id,
  });
  await db.insert(schema.rateLimitCounters).values({
    scope: 'copy',
    subject: `user:${user.id}`,
    windowStart: new Date(),
    count: 1,
  });
  await db
    .insert(schema.moderationRestrictions)
    .values({ discordUserId: identity.id, bannedAt: new Date() });

  const sessions = await Promise.all([
    createSessionCookieValue(identity, user.id),
    createSessionCookieValue(identity, user.id),
  ]);
  for (cookie of sessions)
    assert.equal((await getCurrentUser()).accountId, user.id);
  const exported = JSON.parse(
    JSON.stringify(await getAccountExportByUserId(user.id)),
  );
  assert.equal(exported.version, 2);
  for (const [key, value] of Object.entries(settings))
    assert.equal(exported.settings[key], value);
  for (const key of [
    'cardColor',
    'customGradientFrom',
    'customGradientTo',
    'accentOverride',
    'timezone',
  ])
    assert.equal(exported.profile[key], profileValues[key]);
  assert.deepEqual(
    exported.profile.targetLanguages,
    profileValues.targetLanguages,
  );
  assert.equal(exported.voiceIntro.data, 'dGVzdA==');
  assert.equal(exported.savedProfiles[0].profileId, otherProfile.id);
  assert.equal(exported.blocks[0].blockedUserId, other.id);
  assert.equal(exported.reportsFiled[0].details, 'My submitted report');
  assert.equal(exported.reportsFiled.length, 1);
  assert.equal(exported.notifications[0].kind, 'copy');
  assert.equal(exported.subscription.stripeSubscriptionId, 'sub_isolated');
  for (const key of ['profileBoosts', 'pushSubscriptions', 'analyticsEvents'])
    assert.equal(exported[key].length, 1);
  for (const secret of [
    'Confidential',
    'secret-delivery',
    'actorName',
    'metadata',
    'endpoint',
  ])
    assert.ok(
      !JSON.stringify({
        ...exported,
        excluded: null,
        retention: null,
      }).includes(secret),
    );
  assert.equal(
    (await exportAccount()).headers.get('cache-control'),
    'no-store',
  );

  const response = await deleteAccount(
    new Request('http://localhost/api/account', {
      method: 'DELETE',
      body: JSON.stringify({ confirmation: 'DELETE' }),
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.cookies.get('polycord_session').value, '');
  for (cookie of sessions) {
    assert.equal(await getCurrentUser(), null);
    assert.equal(await getActiveUser(), null);
    assert.equal((await exportAccount()).status, 401);
    assert.equal(
      (
        await deleteAccount(
          new Request('http://localhost/api/account', { method: 'DELETE' }),
        )
      ).status,
      401,
    );
  }
  for (const table of [
    schema.profiles,
    schema.userSettings,
    schema.voiceIntros,
    schema.savedProfiles,
    schema.notifications,
    schema.subscriptions,
    schema.profileBoosts,
    schema.pushSubscriptions,
  ]) {
    assert.equal(
      (await db.select().from(table).where(eq(table.userId, originalId)))
        .length,
      0,
    );
  }
  assert.equal(
    (
      await db
        .select()
        .from(schema.profileTargetLanguages)
        .where(eq(schema.profileTargetLanguages.profileId, profile.id))
    ).length,
    0,
  );
  assert.equal(
    (
      await db
        .select()
        .from(schema.savedProfiles)
        .where(eq(schema.savedProfiles.profileId, profile.id))
    ).length,
    0,
  );
  assert.equal(
    (
      await db
        .select()
        .from(schema.userBlocks)
        .where(eq(schema.userBlocks.blockerUserId, originalId))
    ).length,
    0,
  );
  for (const column of [
    schema.reports.reporterUserId,
    schema.reports.reportedUserId,
  ])
    assert.equal(
      (await db.select().from(schema.reports).where(eq(column, originalId)))
        .length,
      0,
    );
  const [retainedEvent] = await db
    .select()
    .from(schema.analyticsEvents)
    .where(eq(schema.analyticsEvents.id, event.id));
  assert.equal(retainedEvent.userId, null);
  assert.equal(retainedEvent.metadata.ownerUserId, other.id);
  const [retainedAction] = await db
    .select()
    .from(schema.moderationActions)
    .where(eq(schema.moderationActions.id, moderation.id));
  assert.equal(retainedAction.targetUserId, null);
  assert.equal(retainedAction.reportId, null);
  const [retainedActivity] = await db
    .select()
    .from(schema.suspiciousActivity)
    .where(eq(schema.suspiciousActivity.id, suspicious.id));
  assert.equal(retainedActivity.userId, null);
  assert.equal(retainedActivity.ip, '192.0.2.1');
  assert.equal(
    (
      await db
        .select()
        .from(schema.notifications)
        .where(eq(schema.notifications.id, otherInbox.id))
    )[0].actorName,
    identity.name,
  );
  assert.equal(
    (
      await db
        .select()
        .from(schema.rateLimitCounters)
        .where(eq(schema.rateLimitCounters.subject, `user:${originalId}`))
    ).length,
    1,
  );

  process.env.DISCORD_CLIENT_ID = 'isolated-client';
  process.env.DISCORD_CLIENT_SECRET = 'isolated-secret';
  process.env.DISCORD_REDIRECT_URI =
    'http://localhost/api/auth/discord/callback';
  cookie = await createOAuthStateCookieValue({
    nonce: 'isolated-state',
    redirectTo: '/en/profile',
  });
  const { NextRequest } = await import('next/server');
  const { GET: callback } = await import(
    '../../src/app/api/auth/discord/callback/route'
  );
  const originalFetch = globalThis.fetch;
  let freshSession;
  try {
    globalThis.fetch = async (url) => {
      if (url === 'https://discord.com/api/oauth2/token')
        return Response.json({ access_token: 'isolated-token' });
      assert.equal(url, 'https://discord.com/api/users/@me');
      return Response.json({ id: identity.id, username: identity.name });
    };
    const signedIn = await callback(
      new NextRequest(
        'http://localhost/api/auth/discord/callback?code=isolated-code&state=isolated-state',
      ),
    );
    assert.equal(
      signedIn.headers.get('location'),
      'http://localhost/en/profile',
    );
    freshSession = signedIn.cookies.get('polycord_session').value;
  } finally {
    globalThis.fetch = originalFetch;
  }
  user = await getUserByDiscordId(identity.id);
  assert.notEqual(user.id, originalId);
  assert.ok(user.bannedAt);
  for (cookie of sessions) assert.equal(await getCurrentUser(), null);
  assert.equal(await deleteAccountByUserId(originalId), false);
  cookie = freshSession;
  assert.equal((await getCurrentUser()).accountId, user.id);
  assert.equal(await getActiveUser(), null);
  assert.equal((await getAccountExportByUserId(user.id)).profile, null);
  console.log('account lifecycle passed');
} finally {
  await db
    .delete(schema.users)
    .where(inArray(schema.users.id, [user.id, originalId, other.id]));
  await db
    .delete(schema.moderationRestrictions)
    .where(eq(schema.moderationRestrictions.discordUserId, identity.id));
  await db
    .delete(schema.rateLimitCounters)
    .where(eq(schema.rateLimitCounters.subject, `user:${originalId}`));
  for (const [table, id] of [
    [schema.analyticsEvents, retainedIds.event],
    [schema.moderationActions, retainedIds.moderation],
    [schema.suspiciousActivity, retainedIds.suspicious],
  ]) {
    if (id) await db.delete(table).where(eq(table.id, id));
  }
  await globalThis.polycordSql.end();
}
