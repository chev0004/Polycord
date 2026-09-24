import { createHmac, randomUUID } from 'node:crypto';
import { type BrowserContext, expect, test } from '@playwright/test';
import postgres from 'postgres';

type Account = { id: string; discordUserId: string };

const cookieFor = (user: Account) => {
  const payload = Buffer.from(
    JSON.stringify({
      user: {
        id: user.discordUserId,
        accountId: user.id,
        name: user.discordUserId,
        username: user.discordUserId,
      },
      expiresAt: Date.now() + 3600000,
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', 'polycord-isolated-audit-secret')
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
};

const signIn = (context: BrowserContext, user: Account) =>
  context.addCookies([
    {
      name: 'polycord_session',
      value: cookieFor(user),
      domain: 'localhost',
      path: '/',
    },
  ]);

test('a populated saved list supports every card action and return path', async ({
  page,
  context,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const accounts = await sql<
    Account[]
  >`insert into users (discord_user_id, discord_username, display_name)
    select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Saved ' || n from generate_series(0,3) n returning id, discord_user_id as "discordUserId"`;
  const [viewer, ...owners] = accounts;
  try {
    const profiles =
      await sql`insert into profiles (user_id,is_public,primary_language,target_language,proficiency_level,bio,tags,country,timezone)
      select id,true,'en','ja','intermediate','A saved-list journey fixture.',array[${prefix}],'US','America/Chicago' from users where id in ${sql(owners.map((owner) => owner.id))} returning id, user_id`;
    await signIn(context, viewer);
    for (const profile of profiles) {
      const saved = await context.request.post('/api/saved', {
        data: { profileId: profile.id },
      });
      expect(saved.status()).toBe(200);
    }

    await page.goto('/en/saved');
    await expect(page.locator('article')).toHaveCount(3);

    const first = page.locator('article').first();
    const firstName = await first.locator('h3').innerText();
    await first.getByRole('button', { name: 'Card menu' }).click();
    await page
      .getByRole('button', { name: 'View profile', exact: true })
      .click();
    await expect(page).toHaveURL(/\/en\/u\/.*from=%2Fen%2Fsaved/);
    await expect(
      page.getByRole('heading', { name: firstName, exact: true }),
    ).toBeVisible();
    await page.reload();
    await page
      .getByRole('button', { name: 'Back to saved profiles', exact: true })
      .click();
    await expect(page).toHaveURL('/en/saved');
    await expect(page.locator('article')).toHaveCount(3);

    await first.getByRole('button', { name: 'Card menu' }).click();
    await page
      .getByRole('button', { name: 'Remove from saved', exact: true })
      .click();
    await expect(page.locator('article')).toHaveCount(2);
    await page.reload();
    await expect(page.locator('article')).toHaveCount(2);

    const blocked = page.locator('article').first();
    const blockedName = await blocked.locator('h3').innerText();
    await blocked.getByRole('button', { name: 'Card menu' }).click();
    await page.getByRole('button', { name: 'Block user', exact: true }).click();
    await expect(page.getByText(blockedName, { exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.locator('article')).toHaveCount(1);

    await page
      .locator('article')
      .first()
      .getByRole('button', { name: prefix, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/en\\?tag=${prefix}`));
    await expect(page.getByText('2 partners', { exact: true })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL('/en/saved');
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`/en\\?tag=${prefix}`));
  } finally {
    await sql`delete from users where id in ${sql(accounts.map((account) => account.id))}`;
    await sql.end();
  }
});

test('suspended and banned accounts keep reading but cannot write', async ({
  context,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const accounts = await sql<
    Account[]
  >`insert into users (discord_user_id, discord_username, display_name)
    select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Restricted ' || n from generate_series(0,1) n returning id, discord_user_id as "discordUserId"`;
  const [member, owner] = accounts;
  try {
    const [target] =
      await sql`insert into profiles (user_id,is_public,primary_language,target_language,proficiency_level,bio)
      values (${owner.id},true,'en','ja','intermediate','A restricted journey fixture.') returning id`;
    await signIn(context, member);
    expect(
      (
        await context.request.post('/api/saved', {
          data: { profileId: target.id },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await context.request.delete('/api/saved', {
          data: { profileId: target.id },
        })
      ).status(),
    ).toBe(200);
    for (const restrict of [
      () =>
        sql`update users set suspended_until = now() + interval '1 day' where id = ${member.id}`,
      () =>
        sql`update users set suspended_until = null, banned_at = now() where id = ${member.id}`,
    ]) {
      await restrict();
      const page = await context.newPage();
      const response = await page.goto(`/en/u/${target.id}`);
      expect(response?.status()).toBe(200);
      for (const [path, data] of [
        ['/api/saved', { profileId: target.id }],
        ['/api/block', { profileId: target.id }],
        ['/api/report', { profileId: target.id, reason: 'spam' }],
        ['/api/settings', {}],
      ] as const) {
        expect((await context.request.post(path, { data })).status()).toBe(401);
      }
      await page.close();
    }
    expect(
      await sql`select 1 from saved_profiles where user_id = ${member.id}`,
    ).toHaveLength(0);
  } finally {
    await sql`delete from users where id in ${sql(accounts.map((account) => account.id))}`;
    await sql.end();
  }
});

test('admins moderate a report while members cannot reach admin tools', async ({
  browser,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const accounts = await sql<
    Account[]
  >`insert into users (discord_user_id, discord_username, display_name)
    values ('e2e-admin', 'e2e-admin', 'E2E Admin'), (${`${prefix}-reporter`}, ${`${prefix}-reporter`}, ${`${prefix} Reporter`}), (${`${prefix}-reported`}, ${`${prefix}-reported`}, ${`${prefix} Reported`})
    returning id, discord_user_id as "discordUserId"`;
  const [admin, reporter, reported] = accounts;
  const member = await browser.newContext({
    baseURL: 'http://localhost:3119',
  });
  const moderator = await browser.newContext({
    baseURL: 'http://localhost:3119',
  });
  try {
    const [profile] =
      await sql`insert into profiles (user_id,is_public,primary_language,target_language,proficiency_level,bio)
      values (${reported.id},true,'en','ja','intermediate','A moderation journey fixture.') returning id`;
    await sql`insert into reports (reporter_user_id, reported_user_id, reported_profile_id, reason, details)
      values (${reporter.id}, ${reported.id}, ${profile.id}, 'spam', 'Posting links')`;

    await signIn(member, reporter);
    const memberPage = await member.newPage();
    for (const route of ['admin', 'analytics']) {
      await memberPage.goto(`/en/${route}`);
      await expect(memberPage).toHaveURL('/en');
    }
    expect(
      (
        await member.request.post('/api/admin/moderation', {
          data: { reportId: randomUUID(), action: 'warn' },
        })
      ).status(),
    ).toBe(404);

    await signIn(moderator, admin);
    const page = await moderator.newPage();
    await page.goto('/en/admin');
    const entry = page
      .getByRole('listitem')
      .filter({ hasText: `${prefix} Reported` });
    await expect(entry).toContainText('Posting links');
    await entry.getByRole('button', { name: 'Warn', exact: true }).click();
    await expect
      .poll(
        async () =>
          (
            await sql`select 1 from notifications where user_id = ${reported.id} and kind = 'warning'`
          ).length,
      )
      .toBe(1);
    await page.goto('/en/analytics');
    await expect(
      page.getByRole('heading', { name: 'Product analytics' }),
    ).toBeVisible();
  } finally {
    await member.close();
    await moderator.close();
    await sql`delete from users where id in ${sql(accounts.map((account) => account.id))}`;
    await sql.end();
  }
});
