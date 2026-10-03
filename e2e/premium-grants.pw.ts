import { createHmac, randomUUID } from 'node:crypto';
import { type BrowserContext, expect, test } from '@playwright/test';
import postgres from 'postgres';

type Account = { id: string; discordUserId: string };

const signIn = (context: BrowserContext, user: Account, ageHours = 0) => {
  const payload = Buffer.from(
    JSON.stringify({
      user: {
        id: user.discordUserId,
        accountId: user.id,
        name: user.discordUserId,
        username: user.discordUserId,
      },
      issuedAt: Date.now() - ageHours * 3600000,
      expiresAt: Date.now() + 3600000,
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', 'polycord-isolated-audit-secret')
    .update(payload)
    .digest('base64url');
  return context.addCookies([
    {
      name: 'polycord_session',
      value: `${payload}.${signature}`,
      domain: 'localhost',
      path: '/',
    },
  ]);
};

test('owners grant and revoke complimentary premium for real and dummy accounts', async ({
  browser,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  await sql`delete from users where discord_user_id = 'e2e-admin'`;
  const accounts = await sql<Account[]>`
    insert into users (discord_user_id, discord_username, display_name, is_synthetic)
    values ('e2e-admin', 'e2e-admin', 'E2E Owner', false),
      (${`${prefix}-mod`}, ${`${prefix}-mod`}, ${`${prefix} Moderator`}, false),
      (${`${prefix}-member`}, ${`${prefix}-member`}, ${`${prefix} Member`}, false),
      (${`${prefix}-dummy`}, ${`${prefix}-dummy`}, ${`${prefix} Dummy`}, true)
    returning id, discord_user_id as "discordUserId"`;
  const [owner, moderator, member, dummy] = accounts;
  const contexts: BrowserContext[] = [];
  const contextFor = async (user: Account, ageHours = 0) => {
    const context = await browser.newContext({
      baseURL: 'http://localhost:3119',
    });
    contexts.push(context);
    await signIn(context, user, ageHours);
    return context;
  };
  const headers = { Origin: 'http://localhost:3119' };
  const grant = (context: BrowserContext, data: object, withOrigin = true) =>
    context.request.post('/api/admin/premium', {
      headers: withOrigin ? headers : {},
      data,
    });
  const revoke = (context: BrowserContext, userId: string) =>
    context.request.delete('/api/admin/premium', {
      headers,
      data: { userId },
    });
  const premiumCard = async (context: BrowserContext, name: string) => {
    const response = await context.request.get(
      `/api/discovery?q=${encodeURIComponent(name)}&locale=en`,
    );
    const { profiles } = await response.json();
    return profiles.find(
      (profile: { displayName: string }) => profile.displayName === name,
    )?.premium;
  };
  try {
    await sql`insert into staff_roles (user_id) values (${moderator.id})`;
    for (const account of [member, dummy])
      await sql`insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio) values (now(), ${account.id}, true, 'en', 'ja', 'beginner', 'Supporter grant fixture profile.')`;
    const ownerContext = await contextFor(owner);
    const modContext = await contextFor(moderator);
    const memberContext = await contextFor(member);
    const staleContext = await contextFor(owner, 13);
    const sixMonths = { userId: member.id, amount: 6, unit: 'months' };

    expect((await grant(memberContext, sixMonths)).status()).toBe(404);
    expect((await grant(modContext, sixMonths)).status()).toBe(403);
    expect((await revoke(modContext, member.id)).status()).toBe(403);
    expect((await grant(ownerContext, sixMonths, false)).status()).toBe(403);
    expect((await grant(staleContext, sixMonths)).status()).toBe(401);
    for (const invalid of [
      { ...sixMonths, amount: 0 },
      { ...sixMonths, amount: 1.5 },
      { ...sixMonths, amount: 121 },
      { ...sixMonths, unit: 'days' },
    ])
      expect((await grant(ownerContext, invalid)).status()).toBe(400);
    expect(
      await sql`select premium_granted_until from users where id = ${member.id}`,
    ).toEqual([{ premium_granted_until: null }]);
    expect(await premiumCard(memberContext, `${prefix} Member`)).toBeFalsy();
    expect(
      (
        await memberContext.request.post('/api/profile/boost', { headers })
      ).status(),
    ).toBe(403);

    const before = new Date();
    const granted = await grant(ownerContext, sixMonths);
    expect(granted.status()).toBe(200);
    const body = await granted.json();
    const [row] =
      await sql`select premium_granted_until, premium_granted_by from users where id = ${member.id}`;
    const expected = new Date(before);
    expected.setUTCMonth(expected.getUTCMonth() + 6);
    expect(
      Math.abs(row.premium_granted_until.getTime() - expected.getTime()),
    ).toBeLessThan(60000);
    expect(row.premium_granted_by).toBe(owner.id);
    expect(body.users[0].premium.grantedUntil).toBe(
      row.premium_granted_until.toISOString(),
    );
    expect(body.log[0]).toMatchObject({
      action: 'premium_grant',
      userId: member.id,
      staffId: owner.id,
      expiresAt: row.premium_granted_until.toISOString(),
    });
    expect(
      await sql`select 1 from subscriptions where user_id in ${sql([member.id, dummy.id])}`,
    ).toHaveLength(0);
    expect(await premiumCard(memberContext, `${prefix} Member`)).toBe(true);
    expect(
      (
        await memberContext.request.post('/api/profile/boost', { headers })
      ).status(),
    ).toBe(200);

    await sql`update users set premium_granted_until = now() - interval '1 second' where id = ${member.id}`;
    expect(await premiumCard(memberContext, `${prefix} Member`)).toBeFalsy();
    expect((await revoke(ownerContext, member.id)).status()).toBe(404);

    expect((await grant(ownerContext, sixMonths)).status()).toBe(200);
    expect(await premiumCard(memberContext, `${prefix} Member`)).toBe(true);
    const revoked = await revoke(ownerContext, member.id);
    expect(revoked.status()).toBe(200);
    expect(
      (await revoked.json()).users[0].premium.grantedUntil,
    ).toBeUndefined();
    expect(await premiumCard(memberContext, `${prefix} Member`)).toBeFalsy();
    expect((await revoke(ownerContext, member.id)).status()).toBe(404);
    const logged =
      await sql`select action, admin_user_id, expires_at from moderation_actions where target_user_id = ${member.id} order by created_at`;
    expect(logged.map(({ action }) => action)).toEqual([
      'premium_grant',
      'premium_grant',
      'premium_revoke',
    ]);
    expect(
      logged.every(
        ({ admin_user_id, expires_at }) =>
          admin_user_id === owner.id && expires_at instanceof Date,
      ),
    ).toBe(true);
    expect(logged[2].expires_at).toEqual(logged[1].expires_at);

    expect(
      (
        await grant(ownerContext, {
          userId: dummy.id,
          amount: 2,
          unit: 'weeks',
        })
      ).status(),
    ).toBe(200);
    expect(await premiumCard(memberContext, `${prefix} Dummy`)).toBe(true);
    await sql`insert into subscriptions (user_id, stripe_customer_id, status, current_period_end) values (${dummy.id}, ${`test-${prefix}`}, 'active', now() + interval '10 days')`;
    const dummyRevoked = await revoke(ownerContext, dummy.id);
    expect((await dummyRevoked.json()).users[0].premium).toMatchObject({
      configured: false,
    });
    expect(
      (await dummyRevoked.json()).users[0].premium.subscriptionUntil,
    ).toBeDefined();
    expect(await premiumCard(memberContext, `${prefix} Dummy`)).toBe(true);

    const ownerPage = await ownerContext.newPage();
    await ownerPage.setViewportSize({ width: 1280, height: 900 });
    await ownerPage.goto('/en/admin');
    await ownerPage.getByRole('tab', { name: 'Users' }).click();
    await ownerPage
      .getByRole('searchbox', { name: 'Search users' })
      .fill(`${prefix} Member`);
    await expect(
      ownerPage.getByText('No complimentary premium.'),
    ).toBeVisible();
    await ownerPage.getByRole('spinbutton', { name: 'Grant length' }).fill('2');
    await ownerPage.getByRole('button', { name: 'Years' }).click();
    await expect(ownerPage.getByText(/^Ends/)).toBeVisible();
    await ownerPage.getByRole('button', { name: 'Grant premium' }).click();
    await expect(
      ownerPage.getByText(/^Complimentary premium until/),
    ).toBeVisible();
    await expect(ownerPage.getByText(/^Granted premium until/)).toHaveCount(3);
    await ownerPage.reload();
    await ownerPage.getByRole('tab', { name: 'Users' }).click();
    await ownerPage
      .getByRole('searchbox', { name: 'Search users' })
      .fill(`${prefix} Member`);
    await expect(
      ownerPage.getByText(/^Complimentary premium until/),
    ).toBeVisible();
    await ownerPage.getByRole('button', { name: 'Revoke grant' }).click();
    await expect(
      ownerPage.getByText('No complimentary premium.'),
    ).toBeVisible();

    const modPage = await modContext.newPage();
    await modPage.goto('/en/admin');
    await modPage.getByRole('tab', { name: 'Users' }).click();
    await modPage
      .getByRole('searchbox', { name: 'Search users' })
      .fill(`${prefix} Member`);
    await expect(
      modPage.getByText('Supporter grant fixture profile.'),
    ).toBeVisible();
    await expect(
      modPage.getByRole('button', { name: 'Grant premium' }),
    ).toHaveCount(0);
  } finally {
    for (const context of contexts) await context.close();
    await sql`delete from users where id in ${sql(accounts.map((account) => account.id))}`;
    await sql.end();
  }
});
