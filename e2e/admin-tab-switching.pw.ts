import { createHmac, randomUUID } from 'node:crypto';
import { expect, type Request, test } from '@playwright/test';
import postgres from 'postgres';

type Account = { id: string; discordUserId: string };

test.describe('admin tab switching', () => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const utcToday = sql`(date_trunc('day', now() at time zone 'utc') at time zone 'utc')`;
  let owner: Account;
  let reporter: Account;
  let reported: Account[];

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
      from generate_series(1, 5) n
      returning id, discord_user_id as "discordUserId"`;
    await sql`delete from moderation_actions`;
    await sql`delete from reports`;
    await sql`insert into reports (reporter_user_id, reported_user_id, reason, status, created_at)
      select ${reporter.id}, id, 'spam', 'pending', ${utcToday} + interval '1 minute'
      from users where discord_user_id like ${`${prefix}-rep-%`}`;
    await sql`insert into moderation_actions (admin_user_id, target_user_id, action, note, created_at)
      select ${owner.id}, ${reported[0].id}, 'warn', 'today-' || n, ${utcToday} + n * interval '1 minute'
      from generate_series(1, 5) n`;
  });

  test.afterAll(async () => {
    await sql`delete from moderation_actions`;
    await sql`delete from reports`;
    await sql`delete from users where id in ${sql([owner, reporter, ...reported].map(({ id }) => id))}`;
    await sql.end();
  });

  test('prefetched tabs open without a spinner and refresh quietly', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: 'http://localhost:3119',
      viewport: { width: 1400, height: 900 },
      timezoneId: 'UTC',
    });
    const payload = Buffer.from(
      JSON.stringify({
        user: {
          id: owner.discordUserId,
          accountId: owner.id,
          name: owner.discordUserId,
          username: owner.discordUserId,
        },
        issuedAt: Date.now(),
        expiresAt: Date.now() + 3600000,
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', 'polycord-isolated-audit-secret')
      .update(payload)
      .digest('base64url');
    await context.addCookies([
      {
        name: 'polycord_session',
        value: `${payload}.${signature}`,
        domain: 'localhost',
        path: '/',
      },
    ]);
    const page = await context.newPage();
    const requests: string[] = [];
    const finished: string[] = [];
    const track = (urls: string[]) => (request: Request) => {
      const { pathname, search } = new URL(request.url());
      if (pathname.startsWith('/api/admin/') && pathname !== '/api/admin/seed')
        urls.push(`${pathname}${search}`);
    };
    page.on('request', track(requests));
    page.on('requestfinished', track(finished));
    const count = (path: string, urls = requests) =>
      urls.filter((url) => url.startsWith(path)).length;

    await page.goto('/en/admin');
    const queue = page.getByRole('region', { name: 'Reports', exact: true });
    await expect(
      queue.getByRole('button', { name: new RegExp(`${prefix} Reported`) }),
    ).toHaveCount(5);
    await expect
      .poll(() =>
        [
          '/api/admin/actioned',
          '/api/admin/activity-log',
          '/api/admin/suspicious-activity',
        ].map((path) => count(path, finished)),
      )
      .toEqual([1, 1, 1]);

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
    const sawSpinner = () =>
      page.evaluate(() => (window as unknown as { spinner: boolean }).spinner);

    await page.getByRole('tab', { name: 'Activity log' }).click();
    await expect(page.getByText(/^today-\d$/)).toHaveCount(5);
    expect(await sawSpinner()).toBe(false);

    await page.getByRole('tab', { name: 'Users' }).click();
    await expect(
      page
        .getByRole('region', { name: 'Users', exact: true })
        .getByRole('button', { name: new RegExp(`${prefix} Reported 01`) }),
    ).toBeVisible();
    expect(await sawSpinner()).toBe(false);

    await page.getByRole('tab', { name: /^Suspicious activity/ }).click();
    await expect(page.getByText('No suspicious activity')).toBeVisible();
    expect(await sawSpinner()).toBe(false);

    await page.getByRole('tab', { name: /^Reports/ }).click();
    await expect(
      queue.getByRole('button', { name: new RegExp(`${prefix} Reported`) }),
    ).toHaveCount(5);
    expect(await sawSpinner()).toBe(false);

    for (const path of [
      '/api/admin/reports',
      '/api/admin/actioned',
      '/api/admin/activity-log',
      '/api/admin/suspicious-activity',
    ]) {
      const urls = requests.filter((url) => url.startsWith(path));
      expect(urls.length).toBeGreaterThan(0);
      expect(new Set(urls).size).toBe(urls.length);
    }

    await queue
      .getByRole('button', { name: new RegExp(`${prefix} Reported 01`) })
      .click();
    await page.getByRole('button', { name: 'Dismiss D' }).click();
    await page
      .getByRole('dialog', { name: 'Dismiss report?' })
      .getByRole('button', { name: 'Dismiss report' })
      .click();
    await expect(
      queue.getByRole('button', { name: new RegExp(`${prefix} Reported`) }),
    ).toHaveCount(4);

    await page.getByRole('tab', { name: 'Activity log' }).click();
    await expect(page.getByText('Dismissed report')).toBeVisible();
    expect(await sawSpinner()).toBe(false);
    await context.close();
  });
});
