import { createHmac, randomUUID } from 'node:crypto';
import {
  type Browser,
  type BrowserContext,
  expect,
  test,
} from '@playwright/test';
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

test.describe('admin report and actioned pages', () => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const utcToday = sql`(date_trunc('day', now() at time zone 'utc') at time zone 'utc')`;
  let owner: Account;
  let reporter: Account;
  let reported: Account[];

  const open = async (browser: Browser) => {
    const context = await browser.newContext({
      baseURL: 'http://localhost:3119',
      viewport: { width: 1400, height: 900 },
      timezoneId: 'UTC',
    });
    await signIn(context, owner);
    return { context, page: await context.newPage() };
  };

  test.beforeAll(async () => {
    await sql`delete from users where discord_user_id = 'e2e-admin'`;
    [owner, reporter] = await sql<Account[]>`
      insert into users (discord_user_id, discord_username, display_name)
      values ('e2e-admin', 'e2e-admin', 'E2E Owner'),
        (${`${prefix}-reporter`}, ${`${prefix}-reporter`}, ${`${prefix} Reporter`})
      returning id, discord_user_id as "discordUserId"`;
    reported = await sql<Account[]>`
      insert into users (discord_user_id, discord_username, display_name)
      select ${`${prefix}-rep-`} || lpad(n::text, 2, '0'),
        ${`${prefix}-rep-`} || lpad(n::text, 2, '0'),
        ${`${prefix} Reported `} || lpad(n::text, 2, '0')
      from generate_series(1, 30) n
      returning id, discord_user_id as "discordUserId"`;
    await sql`delete from moderation_actions`;
    await sql`delete from reports`;
    await sql`insert into reports (reporter_user_id, reported_user_id, reason, status, created_at)
      select ${reporter.id}, u.id, case when n <= 10 then 'harassment' else 'spam' end::report_reason,
        'pending', ${utcToday} + n * interval '1 minute'
      from (select id, row_number() over (order by discord_user_id) n from users where discord_user_id like ${`${prefix}-rep-%`}) u`;
    await sql`insert into reports (reporter_user_id, reported_user_id, reason, status, created_at)
      select ${reporter.id}, u.id, 'other', 'dismissed', ${utcToday} + interval '2 hours'
      from (select id, row_number() over (order by discord_user_id) n from users where discord_user_id like ${`${prefix}-rep-%`}) u
      where n <= 3`;
    await sql`insert into reports (reporter_user_id, reported_user_id, reason, status, created_at)
      select ${reporter.id}, u.id, 'other', 'pending', ${utcToday} - interval '1 day' + interval '1 hour'
      from (select id, row_number() over (order by discord_user_id) n from users where discord_user_id like ${`${prefix}-rep-%`}) u
      where n <= 2`;
    await sql`insert into moderation_actions (admin_user_id, target_user_id, action, created_at)
      select ${owner.id}, u.id, 'warn', ${utcToday} + n * interval '1 minute'
      from (select id, row_number() over (order by discord_user_id) n from users where discord_user_id like ${`${prefix}-rep-%`}) u`;
    await sql`insert into moderation_actions (admin_user_id, target_user_id, action, created_at)
      select ${owner.id}, u.id, 'ban', ${utcToday} + interval '3 hours'
      from (select id, row_number() over (order by discord_user_id) n from users where discord_user_id like ${`${prefix}-rep-%`}) u
      where n <= 3`;
  });

  test.afterAll(async () => {
    await sql`delete from moderation_actions`;
    await sql`delete from reports`;
    await sql`delete from users where id in ${sql([owner, reporter, ...reported].map(({ id }) => id))}`;
    await sql.end();
  });

  test('the report and actioned endpoints are bounded and staff only', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: 'http://localhost:3119',
    });
    const day = new Date();
    const query = (extra: Record<string, string> = {}) =>
      new URLSearchParams({
        from: new Date(
          Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()),
        ).toISOString(),
        to: new Date(
          Date.UTC(
            day.getUTCFullYear(),
            day.getUTCMonth(),
            day.getUTCDate() + 1,
          ),
        ).toISOString(),
        ...extra,
      });

    for (const path of ['reports', 'actioned']) {
      expect(
        (await context.request.get(`/api/admin/${path}?${query()}`)).status(),
      ).toBe(404);
    }

    await signIn(context, owner);
    const reports = await context.request.get(
      `/api/admin/reports?${query({ status: 'pending' })}`,
    );
    expect(reports.status()).toBe(200);
    const body = await reports.json();
    expect(body.reports).toHaveLength(25);
    expect(body.nextCursor).toBeTruthy();

    const filtered = await context.request.get(
      `/api/admin/reports?${query({ status: 'pending', reason: 'harassment' })}`,
    );
    expect((await filtered.json()).reports).toHaveLength(10);

    const actioned = await context.request.get(
      `/api/admin/actioned?${query()}`,
    );
    const actionedBody = await actioned.json();
    expect(actionedBody.actioned).toHaveLength(25);
    expect(
      new Set(
        actionedBody.actioned.map((row: { userId: string }) => row.userId),
      ).size,
    ).toBe(25);

    const invalid: Record<string, string>[] = [
      { reason: 'rude' },
      { status: 'everything' },
      { to: '2099-01-01T00:00:00.000Z' },
    ];
    for (const bad of invalid) {
      expect(
        (
          await context.request.get(`/api/admin/reports?${query(bad)}`)
        ).status(),
      ).toBe(400);
    }
    await context.close();
  });

  test('reports open on today, page, filter and move between days', async ({
    browser,
  }) => {
    const { context, page } = await open(browser);
    const sizes: number[] = [];
    page.on('response', async (response) => {
      if (response.url().includes('/api/admin/reports'))
        sizes.push((await response.json()).reports.length);
    });
    await page.goto('/en/admin');
    const queue = page.getByRole('region', { name: 'Reports', exact: true });
    const rows = queue.getByRole('button', {
      name: new RegExp(`${prefix} Reported`),
    });
    await expect(rows).toHaveCount(25);
    await expect(queue.getByText('Page 1')).toBeVisible();
    await expect(
      queue.getByRole('button', { name: 'Previous', exact: true }),
    ).toBeDisabled();

    await queue.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(rows).toHaveCount(5);
    await expect(queue.getByText('Page 2')).toBeVisible();

    await queue.getByRole('button', { name: 'All reasons' }).click();
    await page.getByRole('button', { name: 'Harassment', exact: true }).click();
    await expect(rows).toHaveCount(10);
    await expect(queue.getByText('Page 1')).toBeVisible();
    await queue.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(rows).toHaveCount(25);

    await queue.getByRole('tab', { name: 'Resolved' }).click();
    await expect(rows).toHaveCount(3);

    await queue.getByRole('tab', { name: 'Pending' }).click();
    await queue.getByRole('button', { name: 'Previous day' }).click();
    await expect(rows).toHaveCount(2);
    await queue.getByRole('tab', { name: 'Resolved' }).click();
    await expect(
      queue.getByText('No resolved reports', { exact: true }),
    ).toBeVisible();

    expect(Math.max(...sizes)).toBeLessThanOrEqual(25);
    await context.close();
  });

  test('recently actioned pages by day and search replaces the list', async ({
    browser,
  }) => {
    const { context, page } = await open(browser);
    await page.goto('/en/admin');
    await page.getByRole('tab', { name: 'Users' }).click();
    const list = page.getByRole('region', { name: 'Users', exact: true });
    const rows = list.getByRole('button', {
      name: new RegExp(`${prefix} Reported`),
    });
    await expect(rows).toHaveCount(25);
    await expect(list.getByText('Page 1')).toBeVisible();
    await list.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(rows).toHaveCount(5);

    await list.getByRole('button', { name: 'All actions' }).click();
    await page
      .getByRole('button', { name: 'Banned user', exact: true })
      .click();
    await expect(rows).toHaveCount(3);
    await expect(list.getByText('Page 1')).toBeVisible();

    await list.getByRole('button', { name: 'Previous day' }).click();
    await expect(list.getByText('No matching actions')).toBeVisible();
    await list.getByRole('button', { name: 'Clear filters' }).click();
    await expect(list.getByText('No accounts actioned')).toBeVisible();

    await list
      .getByRole('button', { name: 'Today', exact: true })
      .first()
      .click();
    await list.getByLabel('Search users').fill(`${prefix} Reported 07`);
    await expect(rows).toHaveCount(1);
    await expect(list.getByText('Page 1')).toHaveCount(0);
    await expect(list.getByRole('button', { name: 'Next day' })).toHaveCount(0);
    await context.close();
  });

  test('acting on a report moves it to resolved without a reload', async ({
    browser,
  }) => {
    const { context, page } = await open(browser);
    await page.goto('/en/admin');
    const queue = page.getByRole('region', { name: 'Reports', exact: true });
    const target = queue.getByRole('button', {
      name: new RegExp(`${prefix} Reported 30`),
    });
    await expect(target).toBeVisible();
    const badge = page.getByRole('tab', { name: /^Reports/ });
    await expect(badge).toContainText('30');

    await target.click();
    await page.getByRole('button', { name: 'Dismiss D' }).click();
    await page
      .getByRole('dialog', { name: 'Dismiss report?' })
      .getByRole('button', { name: 'Dismiss report' })
      .click();
    await expect(target).toHaveCount(0);
    await expect(badge).toContainText('29');

    await queue.getByRole('tab', { name: 'Resolved' }).click();
    await expect(target).toBeVisible();
    await context.close();
  });
});
