import { createHmac, randomUUID } from 'node:crypto';
import { type BrowserContext, expect, test } from '@playwright/test';
import postgres from 'postgres';

type Account = { id: string; discordUserId: string };

const signIn = (context: BrowserContext, user: Account) => {
  const payload = Buffer.from(
    JSON.stringify({
      user: {
        id: user.discordUserId,
        accountId: user.id,
        name: user.discordUserId,
        username: user.discordUserId,
      },
      issuedAt: Date.now(),
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

test.describe('admin activity pages', () => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const utcToday = sql`(date_trunc('day', now() at time zone 'utc') at time zone 'utc')`;
  let owner: Account;
  let target: Account;
  let moderator: Account;

  test.beforeAll(async () => {
    await sql`delete from users where discord_user_id = 'e2e-admin'`;
    [owner, target, moderator] = await sql<Account[]>`
      insert into users (discord_user_id, discord_username, display_name)
      values ('e2e-admin', 'e2e-admin', 'E2E Owner'),
        (${`${prefix}-target`}, ${`${prefix}-target`}, ${`${prefix} Target`}),
        (${`${prefix}-mod`}, ${`${prefix}-mod`}, ${`${prefix} Mod`})
      returning id, discord_user_id as "discordUserId"`;
    await sql`insert into staff_roles (user_id) values (${moderator.id})`;
    await sql`delete from moderation_actions`;
    await sql`insert into moderation_actions (admin_user_id, target_user_id, action, note, created_at)
      select ${moderator.id}, ${target.id}, 'ban', 'ban-' || n, ${utcToday} + n * interval '1 second'
      from generate_series(1, 3) as n`;
    await sql`insert into moderation_actions (admin_user_id, target_user_id, action, note, created_at)
      select ${owner.id}, ${target.id}, 'warn', 'today-' || n, ${utcToday} + n * interval '1 minute'
      from generate_series(1, 30) as n`;
    await sql`insert into moderation_actions (admin_user_id, target_user_id, action, note, created_at)
      select ${owner.id}, ${target.id}, 'warn', 'yesterday-' || n, ${utcToday} - interval '1 day' + n * interval '1 minute'
      from generate_series(1, 3) as n`;
  });

  test.afterAll(async () => {
    await sql`delete from moderation_actions`;
    await sql`delete from users where id in ${sql([owner, target, moderator].map(({ id }) => id))}`;
    await sql.end();
  });

  test('the activity log opens on today and pages through bounded slices', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: 'http://localhost:3119',
      viewport: { width: 1400, height: 900 },
      timezoneId: 'UTC',
    });
    await signIn(context, owner);
    const page = await context.newPage();
    const sizes: number[] = [];
    const urls: string[] = [];
    page.on('response', async (response) => {
      if (!response.url().includes('/api/admin/activity-log')) return;
      urls.push(response.url());
      sizes.push((await response.json()).log.length);
    });

    await page.goto('/en/admin');
    await page.getByRole('tab', { name: 'Activity log' }).click();
    const rows = page.getByText(/^today-\d+$/);
    await expect(rows).toHaveCount(25);
    await expect(page.getByText(/^yesterday-/)).toHaveCount(0);
    await expect(page.getByText('Page 1')).toBeVisible();
    await expect(page.getByLabel('Select a date')).toHaveValue(
      new Date().toISOString().slice(0, 10),
    );
    await expect(page.getByRole('button', { name: 'Next day' })).toBeDisabled();
    await expect(
      page.getByRole('button', { name: 'Previous', exact: true }),
    ).toBeDisabled();
    await expect(page.getByText('today-30', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(rows).toHaveCount(5);
    await expect(page.getByText('Page 2')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Next', exact: true }),
    ).toBeDisabled();
    await expect(page.getByText('today-1', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await expect(rows).toHaveCount(25);
    await expect(page.getByText('Page 1')).toBeVisible();

    await page.getByRole('button', { name: 'Previous day' }).click();
    await expect(page.getByText(/^yesterday-\d+$/)).toHaveCount(3);
    await expect(page.getByText(/^today-/)).toHaveCount(0);
    await expect(page.getByText('Page 1')).toBeVisible();

    await page.getByLabel('Select a date').fill('2001-01-01');
    await expect(page.getByText('No activity on this day')).toBeVisible();

    await page
      .getByRole('button', { name: 'Today', exact: true })
      .first()
      .click();
    await expect(rows).toHaveCount(25);

    expect(Math.max(...sizes)).toBeLessThanOrEqual(25);
    expect(
      urls.every((url) => url.includes('from=') && url.includes('to=')),
    ).toBe(true);
    await context.close();
  });

  test('filters run on the server and the view survives switching tabs', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: 'http://localhost:3119',
      viewport: { width: 1400, height: 900 },
      timezoneId: 'UTC',
    });
    await signIn(context, owner);
    const page = await context.newPage();
    await page.goto('/en/admin');
    await page.getByRole('tab', { name: 'Activity log' }).click();
    await expect(page.getByText(/^ban-\d+$/)).toHaveCount(0);

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Page 2')).toBeVisible();
    await page.getByRole('tab', { name: /^Suspicious activity/ }).click();
    await page.getByRole('tab', { name: 'Activity log' }).click();
    await expect(page.getByText('Page 2')).toBeVisible();

    await page.getByRole('button', { name: 'All actions' }).click();
    await page
      .getByRole('button', { name: 'Banned user', exact: true })
      .click();
    await expect(page.getByText(/^ban-\d+$/)).toHaveCount(3);
    await expect(page.getByText(/^today-/)).toHaveCount(0);
    await expect(page.getByText('Page 1')).toBeVisible();

    await page.getByRole('button', { name: 'All staff' }).click();
    await page.getByRole('button', { name: `${prefix} Mod` }).click();
    await expect(page.getByText(/^ban-\d+$/)).toHaveCount(3);

    await page.getByRole('tab', { name: /^Suspicious activity/ }).click();
    await page.getByRole('tab', { name: 'Activity log' }).click();
    await expect(page.getByText(/^ban-\d+$/)).toHaveCount(3);
    await expect(
      page.getByRole('button', { name: `${prefix} Mod` }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(page.getByText(/^today-\d+$/)).toHaveCount(25);
    await context.close();
  });
});
