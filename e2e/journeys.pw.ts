import { createHmac, randomUUID } from 'node:crypto';
import { type BrowserContext, expect, test } from '@playwright/test';
import postgres from 'postgres';

type Account = { id: string; discordUserId: string };

const cookieFor = (user: Account, ageHours = 0) => {
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
  return `${payload}.${signature}`;
};

const signIn = (context: BrowserContext, user: Account, ageHours = 0) =>
  context.addCookies([
    {
      name: 'polycord_session',
      value: cookieFor(user, ageHours),
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
      await sql`insert into profiles (last_bumped_at,user_id,is_public,primary_language,target_language,proficiency_level,bio,tags,country,timezone)
      select now(),id,true,'en','ja','intermediate','A saved-list journey fixture.',array[${prefix}],'US','America/Chicago' from users where id in ${sql(owners.map((owner) => owner.id))} returning id, user_id`;
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
    const cardMenu = blocked.getByRole('button', { name: 'Card menu' });
    await cardMenu.click();
    await page.getByRole('button', { name: 'Block user', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(cardMenu).toBeFocused();
    await expect(page.getByText(blockedName, { exact: true })).toHaveCount(1);
    await cardMenu.click();
    await page.getByRole('button', { name: 'Block user', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Block user', exact: true })
      .click();
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

test('saved profile search, filters and sorting stay within the saved list', async ({
  page,
  context,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const accounts = await sql<
    Account[]
  >`insert into users (discord_user_id, discord_username, display_name)
    select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Search ' || n from generate_series(0,3) n returning id, discord_user_id as "discordUserId"`;
  const [viewer, ...owners] = accounts;
  try {
    const profiles =
      await sql`insert into profiles (last_bumped_at,user_id,is_public,primary_language,target_language,proficiency_level,bio,tags)
      select now(),id,true,case when display_name like '% 2' then 'ja' else 'en' end,'ko','beginner',${`Saved search fixture ${prefix}.`},array['Travel'] from users where id in ${sql(owners.map((owner) => owner.id))} returning id, user_id`;
    await signIn(context, viewer);
    for (const profile of profiles.filter(
      (profile) => profile.user_id !== owners[2].id,
    )) {
      const saved = await context.request.post('/api/saved', {
        data: { profileId: profile.id },
      });
      expect(saved.status()).toBe(200);
    }
    const heading = (name: string) =>
      page.getByRole('heading', { name, exact: true });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/saved');
    await page
      .getByRole('textbox', { name: 'Search profiles' })
      .fill(`${prefix} Search`);
    await expect(page.getByText('2 partners', { exact: true })).toBeVisible();
    await expect(heading(`${prefix} Search 1`)).toBeVisible();
    await expect(heading(`${prefix} Search 2`)).toBeVisible();
    await expect(heading(`${prefix} Search 3`)).toHaveCount(0);
    await expect(page.getByText('Popular tags')).toHaveCount(0);

    await page.getByRole('button', { name: 'Primary Language' }).click();
    const popover = page.locator('.PopoverContent');
    await popover.getByRole('button', { name: 'Japanese' }).click();
    await popover.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText('1 partner', { exact: true })).toBeVisible();
    await expect(heading(`${prefix} Search 2`)).toBeVisible();
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(page.getByText('2 partners', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Back to discovery' }).click();
    await expect(page).toHaveURL('/en');

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/ja/saved');
    const search = page.getByRole('textbox').first();
    await search.fill(prefix);
    await expect(page.locator('article')).toHaveCount(2);
    await search.fill(`${prefix} Search 3`);
    await expect(page.locator('article')).toHaveCount(0);
    await expect(
      page.getByText(
        '検索またはフィルターに一致する保存済みプロフィールはありません。',
        { exact: false },
      ),
    ).toBeVisible();
    await search.fill('');
    await expect(page.locator('article')).toHaveCount(2);
  } finally {
    await sql`delete from users where id in ${sql(accounts.map((account) => account.id))}`;
    await sql.end();
  }
});

test('suspended accounts keep reading but cannot write and banned accounts are denied', async ({
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
      await sql`insert into profiles (last_bumped_at,user_id,is_public,primary_language,target_language,proficiency_level,bio)
      values (now(),${owner.id},true,'en','ja','intermediate','A restricted journey fixture.') returning id`;
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
    for (const [restrict, readStatus, writeStatus] of [
      [
        () =>
          sql`update users set suspended_until = now() + interval '1 day' where id = ${member.id}`,
        200,
        401,
      ],
      [
        () =>
          sql`update users set suspended_until = null, banned_at = now() where id = ${member.id}`,
        403,
        403,
      ],
    ] as const) {
      await restrict();
      const page = await context.newPage();
      const response = await page.goto(`/en/u/${target.id}`);
      expect(response?.status()).toBe(readStatus);
      for (const [path, data] of [
        ['/api/saved', { profileId: target.id }],
        ['/api/block', { profileId: target.id }],
        ['/api/report', { profileId: target.id, reason: 'spam' }],
        ['/api/settings', {}],
      ] as const) {
        expect((await context.request.post(path, { data })).status()).toBe(
          writeStatus,
        );
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
  await sql`delete from users where discord_user_id = 'e2e-admin'`;
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
      await sql`insert into profiles (last_bumped_at,user_id,is_public,primary_language,target_language,proficiency_level,bio)
      values (now(),${reported.id},true,'en','ja','intermediate','A moderation journey fixture.') returning id`;
    await sql`insert into reports (reporter_user_id, reported_user_id, reported_profile_id, reason, details)
      values (${reporter.id}, ${reported.id}, ${profile.id}, 'spam', 'Posting links'),
      (${reporter.id}, ${reported.id}, ${profile.id}, 'harassment', 'Rude replies')`;

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
    for (const [origin, userId] of [
      ['https://evil.example', reported.id],
      ['http://localhost:3119', admin.id],
    ]) {
      expect(
        (
          await moderator.request.post('/api/admin/moderation', {
            headers: { Origin: origin },
            data: { userId, action: 'warn', note: 'Please be kind.' },
          })
        ).status(),
      ).toBe(403);
    }
    const page = await moderator.newPage();
    await page.goto('/en/admin');
    const queue = page.getByRole('region', { name: 'Reports' });
    const entry = queue.getByRole('button', {
      name: new RegExp(`${prefix} Reported`),
    });
    await expect(entry).toHaveCount(1);
    await expect(entry).toContainText('2 reports');
    await entry.click();
    await expect(page.getByText('Posting links')).toBeVisible();
    await expect(page.getByText('Rude replies')).toBeVisible();
    await page.getByRole('button', { name: /^Warn/ }).click();
    const warning = page.getByRole('dialog');
    await expect(
      warning.getByRole('button', { name: 'Send warning' }),
    ).toBeDisabled();
    await warning.getByRole('button', { name: 'Spam or advertising' }).click();
    await warning.getByRole('button', { name: 'Send warning' }).click();
    await expect
      .poll(async () =>
        (
          await sql`select message, warning_category from notifications where user_id = ${reported.id} and kind = 'warning'`
        ).map((row) => [row.message, row.warning_category]),
      )
      .toEqual([[null, 'spam']]);
    expect(
      await sql`select note, warning_category from moderation_actions where target_user_id = ${reported.id} and action = 'warn'`,
    ).toEqual([{ note: null, warning_category: 'spam' }]);
    await expect
      .poll(async () =>
        (
          await sql`select status from reports where reported_user_id = ${reported.id}`
        ).map((row) => row.status),
      )
      .toEqual(['reviewed', 'reviewed']);
    await expect(entry).toHaveCount(0);

    await page.getByRole('tab', { name: 'Users' }).click();
    await page
      .getByRole('searchbox', { name: 'Search users' })
      .fill(`${prefix} Reported`);
    await page.getByRole('button', { name: 'Suspend' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: '30 days' }).click();
    await dialog.getByRole('textbox', { name: 'Note' }).fill('Repeated spam');
    await dialog.getByRole('button', { name: 'Suspend for 30 days' }).click();
    await expect
      .poll(
        async () =>
          (
            await sql`select days, note from moderation_actions where target_user_id = ${reported.id} and action = 'suspend'`
          )[0],
      )
      .toEqual({ days: 30, note: 'Repeated spam' });
    expect(
      (
        await moderator.request.post('/api/admin/moderation', {
          headers: { Origin: 'http://localhost:3119' },
          data: { userId: reported.id, action: 'unsuspend', days: 5 },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await sql`select suspended_until from users where id = ${reported.id}`
      )[0].suspended_until,
    ).toBeNull();
    await page.getByRole('tab', { name: 'Activity log' }).click();
    await expect(
      page.getByText('Suspended user · 30 days').first(),
    ).toBeVisible();
    const discovery = `/api/discovery?q=${encodeURIComponent(`${prefix} Reported`)}&locale=en`;
    const staffCards = (await (await moderator.request.get(discovery)).json())
      .profiles;
    expect(staffCards).toHaveLength(1);
    expect(staffCards[0].moderation).toEqual({
      hidden: false,
      suspended: false,
      banned: false,
      warnings: 1,
      pendingReports: 0,
    });
    const memberCards = (await (await member.request.get(discovery)).json())
      .profiles;
    expect(memberCards).toHaveLength(1);
    expect(memberCards[0]).not.toHaveProperty('moderation');
    await page.goto(`/en/u/${profile.id}`);
    const profilePanel = page.getByRole('dialog', {
      name: `Moderate ${prefix} Reported`,
    });
    const moreActions = page.getByRole('button', { name: 'More actions' });
    await moreActions.click();
    await page.getByRole('button', { name: 'Take action' }).click();
    await expect(profilePanel).toBeVisible();
    await expect(
      profilePanel.getByRole('button', { name: 'Hide profile' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(profilePanel).toBeHidden();
    await expect(moreActions).toBeFocused();
    await expect(page).toHaveURL(`/en/u/${profile.id}`);
    await page.setViewportSize({ width: 390, height: 844 });
    await moreActions.click();
    await page.getByRole('button', { name: 'Take action' }).click();
    await expect(
      page.getByRole('dialog', { name: `${prefix} Reported` }),
    ).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 720 });
    await memberPage.goto(`/en/u/${profile.id}`);
    await memberPage.getByRole('button', { name: 'More actions' }).click();
    await expect(
      memberPage.getByRole('button', { name: 'Report profile' }),
    ).toBeVisible();
    await expect(
      memberPage.getByRole('button', { name: 'Take action' }),
    ).toHaveCount(0);
    await page.goto(`/en?q=${encodeURIComponent(`${prefix} Reported`)}`);
    await page.getByRole('button', { name: 'Card menu' }).first().click();
    await page.getByRole('button', { name: 'Take action' }).click();
    const panel = page.getByRole('dialog', {
      name: `Moderate ${prefix} Reported`,
    });
    await expect(
      panel.getByRole('heading', { name: `${prefix} Reported`, exact: true }),
    ).toBeVisible();
    const hiddenByModeration = async () =>
      (
        await sql`select hidden_by_moderation from profiles where user_id = ${reported.id}`
      )[0].hidden_by_moderation;
    const confirmHide = page.getByRole('dialog', {
      name: `Hide ${prefix} Reported's profile?`,
    });
    await panel.getByRole('button', { name: 'Hide profile' }).click();
    await confirmHide.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirmHide).toBeHidden();
    expect(await hiddenByModeration()).toBe(false);
    await panel.getByRole('button', { name: 'Hide profile' }).click();
    await confirmHide.getByRole('button', { name: 'Hide profile' }).click();
    await expect.poll(hiddenByModeration).toBe(true);
    await expect(
      panel.getByRole('button', { name: 'Unhide profile' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(page).toHaveURL(/\/en\?q=/);
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

test('owners grant and revoke moderators with owner-only actions guarded', async ({
  browser,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  await sql`delete from users where discord_user_id = 'e2e-admin'`;
  const accounts = await sql<
    Account[]
  >`insert into users (discord_user_id, discord_username, display_name)
    values ('e2e-admin', 'e2e-admin', 'E2E Owner'), (${`${prefix}-mod`}, ${`${prefix}-mod`}, ${`${prefix} Moderator`}), (${`${prefix}-target`}, ${`${prefix}-target`}, ${`${prefix} Target`}), (${`${prefix}-mod2`}, ${`${prefix}-mod2`}, ${`${prefix} Second Moderator`})
    returning id, discord_user_id as "discordUserId"`;
  const [owner, moderator, target, otherModerator] = accounts;
  const ownerContext = await browser.newContext({
    baseURL: 'http://localhost:3119',
  });
  const modContext = await browser.newContext({
    baseURL: 'http://localhost:3119',
  });
  const headers = { Origin: 'http://localhost:3119' };
  const post = (context: BrowserContext, url: string, data: object) =>
    context.request.post(url, { headers, data });
  try {
    await signIn(ownerContext, owner);
    await signIn(modContext, moderator);
    const modPage = await modContext.newPage();
    await modPage.goto('/en/admin');
    await expect(modPage).toHaveURL('/en');

    expect(
      (
        await post(ownerContext, '/api/admin/staff', { userId: moderator.id })
      ).status(),
    ).toBe(200);
    expect(
      await sql`select action from moderation_actions where target_user_id = ${moderator.id}`,
    ).toEqual([{ action: 'grant' }]);

    await modPage.goto('/en/admin');
    await expect(modPage.getByText('Moderator', { exact: true })).toBeVisible();
    await expect(
      modPage.getByRole('button', { name: 'Manage staff' }),
    ).toHaveCount(0);
    for (const action of ['ban', 'unban']) {
      expect(
        (
          await post(modContext, '/api/admin/moderation', {
            userId: target.id,
            action,
          })
        ).status(),
      ).toBe(403);
    }
    expect(
      (
        await post(modContext, '/api/admin/staff', { userId: target.id })
      ).status(),
    ).toBe(403);
    expect(
      (
        await post(modContext, '/api/admin/moderation', {
          userId: target.id,
          action: 'warn',
          note: 'Please be kind.',
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await post(ownerContext, '/api/admin/staff', {
          userId: otherModerator.id,
        })
      ).status(),
    ).toBe(200);
    for (const userId of [otherModerator.id, owner.id]) {
      expect(
        (
          await post(modContext, '/api/admin/moderation', {
            userId,
            action: 'warn',
            note: 'Please be kind.',
          })
        ).status(),
      ).toBe(403);
    }
    expect(
      (
        await post(modContext, '/api/admin/staff', {
          userId: otherModerator.id,
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await modContext.request.delete('/api/admin/staff', {
          headers,
          data: { userId: otherModerator.id },
        })
      ).status(),
    ).toBe(403);
    for (const data of [
      { action: 'warn', note: 'Please be kind.' },
      { action: 'hide_profile' },
      { action: 'suspend', days: 1 },
      { action: 'ban' },
    ]) {
      expect(
        (
          await post(ownerContext, '/api/admin/moderation', {
            userId: otherModerator.id,
            ...data,
          })
        ).status(),
      ).toBe(200);
    }
    expect(
      (
        await post(ownerContext, '/api/admin/moderation', {
          userId: owner.id,
          action: 'warn',
          note: 'Please be kind.',
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await ownerContext.request.delete('/api/admin/staff', {
          headers,
          data: { userId: owner.id },
        })
      ).status(),
    ).toBe(409);
    await modPage.goto('/en/analytics');
    await expect(modPage).toHaveURL('/en');

    const staleContext = await browser.newContext({
      baseURL: 'http://localhost:3119',
    });
    await signIn(staleContext, owner, 13);
    expect(
      (
        await post(staleContext, '/api/admin/moderation', {
          userId: target.id,
          action: 'ban',
        })
      ).status(),
    ).toBe(401);
    await staleContext.close();
    expect(
      (await sql`select banned_at from users where id = ${target.id}`)[0]
        .banned_at,
    ).toBeNull();

    expect(
      (
        await ownerContext.request.delete('/api/admin/staff', {
          headers,
          data: { userId: moderator.id },
        })
      ).status(),
    ).toBe(200);
    await modPage.goto('/en/admin');
    await expect(modPage).toHaveURL('/en');
  } finally {
    await ownerContext.close();
    await modContext.close();
    await sql`delete from users where id in ${sql(accounts.map((account) => account.id))}`;
    await sql.end();
  }
});
