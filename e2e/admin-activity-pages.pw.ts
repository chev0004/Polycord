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
    await sql`insert into moderation_actions (admin_user_id, target_user_id, action, note, created_at)
      values (${owner.id}, ${target.id}, 'warn', 'older-1', ${utcToday} - interval '5 days' + interval '1 minute')`;
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
    await expect(
      page.getByRole('button', { name: 'Select a date' }),
    ).toHaveText(
      new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'UTC',
      }),
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

    await page.getByRole('button', { name: 'Select a date' }).click();
    await page.getByRole('button', { name: 'Previous month' }).click();
    await page
      .getByRole('button', { name: /^\w{3}, \w{3} 15, \d+ actions?$/ })
      .click();
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

  test('the calendar rings count each day in the staff time zone', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: 'http://localhost:3119',
      viewport: { width: 1400, height: 900 },
      timezoneId: 'UTC',
    });
    await signIn(context, owner);
    const page = await context.newPage();
    const counts: string[] = [];
    page.on('response', async (response) => {
      if (response.url().includes('/api/admin/activity-days'))
        counts.push(response.url());
    });

    await page.goto('/en/admin');
    await page.getByRole('tab', { name: 'Activity log' }).click();
    await page.getByRole('button', { name: 'Select a date' }).click();
    const label = (offset: number) =>
      new Date(Date.now() - offset * 86400000).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
    await expect(
      page.getByRole('button', { name: `${label(0)}, 33 actions` }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: `${label(1)}, 3 actions` }),
    ).toBeVisible();
    await expect(page.getByText('actions this month')).toBeVisible();
    const log = counts.filter((url) => url.includes('kind=log'));
    expect(new Set(counts).size).toBe(counts.length);
    expect(log.length).toBeGreaterThan(0);
    expect(log[0]).toContain('timeZone=UTC');
    await context.close();
  });

  test('the calendar opens with its counts on the first frame', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: 'http://localhost:3119',
      viewport: { width: 1400, height: 900 },
      timezoneId: 'UTC',
    });
    await signIn(context, owner);
    const page = await context.newPage();
    const finished: string[] = [];
    page.on('requestfinished', (request) => {
      if (request.url().includes('/api/admin/activity-days'))
        finished.push(request.url());
    });

    await page.goto('/en/admin');
    await expect.poll(() => finished.length).toBeGreaterThanOrEqual(4);
    await page.getByRole('tab', { name: 'Activity log' }).click();
    await page.getByRole('button', { name: 'Select a date' }).click();
    expect(
      await page.getByRole('button', { name: /, \d+ actions?$/ }).count(),
    ).toBeGreaterThan(0);
    expect(await page.getByText('actions this month').isVisible()).toBe(true);
    await page.getByRole('button', { name: 'Previous month' }).click();
    expect(
      await page.getByRole('button', { name: /, \d+ actions?$/ }).count(),
    ).toBeGreaterThan(0);
    await context.close();
  });

  test('adjacent and empty days open without a request or a spinner', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: 'http://localhost:3119',
      viewport: { width: 1400, height: 900 },
      timezoneId: 'UTC',
    });
    await signIn(context, owner);
    const page = await context.newPage();
    const logRequests: string[] = [];
    const dayRequests: string[] = [];
    page.on('requestfinished', (request) => {
      const url = request.url();
      if (url.includes('/api/admin/activity-log')) logRequests.push(url);
      if (url.includes('/api/admin/activity-days')) dayRequests.push(url);
    });

    await page.goto('/en/admin');
    await page.waitForResponse((response) =>
      response.url().includes('/api/admin/reports'),
    );
    await page.getByRole('tab', { name: 'Activity log' }).click();
    await expect(page.getByText(/^today-\d+$/).first()).toBeVisible();
    await expect.poll(() => logRequests.length).toBeGreaterThanOrEqual(2);
    await expect
      .poll(() => dayRequests.filter((url) => url.includes('kind=log')).length)
      .toBeGreaterThanOrEqual(1);
    await page.evaluate(() => {
      const view = window as unknown as { spinner: boolean };
      view.spinner = false;
      new MutationObserver((records) => {
        for (const record of records)
          for (const node of record.addedNodes)
            if (node.textContent?.includes('Loading activity'))
              view.spinner = true;
      }).observe(document.body, { childList: true, subtree: true });
    });

    await page.getByRole('button', { name: 'Previous day' }).click();
    await expect(page.getByText(/^yesterday-\d+$/)).toHaveCount(3, {
      timeout: 300,
    });

    const requested = logRequests.length;
    await page.getByRole('button', { name: 'Previous day' }).click();
    await expect(page.getByText('No activity on this day')).toBeVisible({
      timeout: 300,
    });
    expect(logRequests).toHaveLength(requested);
    expect(
      await page.evaluate(
        () => (window as unknown as { spinner: boolean }).spinner,
      ),
    ).toBe(false);
    await context.close();
  });

  test('an uncached day keeps the previous rows dimmed while it loads', async ({
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
    await page.waitForResponse((response) =>
      response.url().includes('/api/admin/reports'),
    );
    await page.getByRole('tab', { name: 'Activity log' }).click();
    await expect(page.getByText(/^today-\d+$/).first()).toBeVisible();
    await page.route('**/api/admin/activity-log*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await page.getByRole('button', { name: 'Select a date' }).click();
    const older = new Date(Date.now() - 5 * 86400000).toLocaleDateString(
      'en-US',
      { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' },
    );
    const day = page.getByRole('button', { name: `${older}, 1 action` });
    if (!(await day.count()))
      await page.getByRole('button', { name: 'Previous month' }).click();
    await day.click();

    const rows = page.getByText(/^today-\d+$/).first();
    await expect(rows).toBeVisible();
    await expect(
      rows.locator('xpath=ancestor::div[contains(@class,"opacity-50")]'),
    ).toHaveCount(1);
    await expect(page.getByText('Loading activity')).toHaveCount(0);
    await expect(page.getByText('older-1')).toBeVisible();
    await expect(page.getByText(/^today-\d+$/)).toHaveCount(0);
    await context.close();
  });

  test('the activity days endpoint is bounded and staff only', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: 'http://localhost:3119',
    });
    const month = new Date();
    const query = (extra: Record<string, string>) =>
      new URLSearchParams({
        kind: 'log',
        from: new Date(
          Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1),
        ).toISOString(),
        to: new Date(
          Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1),
        ).toISOString(),
        timeZone: 'UTC',
        ...extra,
      });
    const today = new Date().toISOString().slice(0, 10);

    expect(
      (
        await context.request.get(`/api/admin/activity-days?${query({})}`)
      ).status(),
    ).toBe(404);

    await signIn(context, owner);
    const log = await context.request.get(
      `/api/admin/activity-days?${query({})}`,
    );
    expect(log.status()).toBe(200);
    expect((await log.json()).days[today]).toBe(33);

    const actioned = await context.request.get(
      `/api/admin/activity-days?${query({ kind: 'actioned' })}`,
    );
    expect((await actioned.json()).days[today]).toBe(1);

    const invalid: Record<string, string>[] = [
      { kind: 'everything' },
      { timeZone: 'Mars/Olympus' },
      { to: '2099-01-01T00:00:00.000Z' },
    ];
    for (const bad of invalid) {
      expect(
        (
          await context.request.get(`/api/admin/activity-days?${query(bad)}`)
        ).status(),
      ).toBe(400);
    }
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
