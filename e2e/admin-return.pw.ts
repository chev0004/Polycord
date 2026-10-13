import { createHmac, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

type Account = { id: string; discordUserId: string };

test.describe('admin return visits', () => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const utcToday = sql`(date_trunc('day', now() at time zone 'utc') at time zone 'utc')`;
  let owner: Account;
  let target: Account;

  test.beforeAll(async () => {
    await sql`delete from users where discord_user_id = 'e2e-admin'`;
    [owner, target] = await sql<Account[]>`
      insert into users (discord_user_id, discord_username, display_name)
      values ('e2e-admin', 'e2e-admin', 'E2E Owner'),
        (${`${prefix}-target`}, ${`${prefix}-target`}, ${`${prefix} Target`})
      returning id, discord_user_id as "discordUserId"`;
    await sql`delete from moderation_actions`;
    await sql`insert into moderation_actions (admin_user_id, target_user_id, action, note, created_at)
      select ${owner.id}, ${target.id}, 'warn', 'return-' || n, ${utcToday} + n * interval '1 minute'
      from generate_series(1, 3) n`;
  });

  test.afterAll(async () => {
    await sql`delete from moderation_actions`;
    await sql`delete from users where id in ${sql([owner, target].map(({ id }) => id))}`;
    await sql.end();
  });

  test('leaving Admin and coming back reopens the last tab, day and rows at once', async ({
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
    const storage = () =>
      page.evaluate(() => localStorage.length + sessionStorage.length);

    await page.goto('/en/admin');
    await page.getByRole('tab', { name: 'Activity log' }).click();
    await expect(page.getByText(/^return-\d$/)).toHaveCount(3);

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

    await page.getByRole('button', { name: 'Polycord', exact: true }).click();
    await expect(page).toHaveURL(/\/en$/);
    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page).toHaveURL(/\/en\/admin$/);

    await expect(
      page.getByRole('tab', { name: 'Activity log' }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText(/^return-\d$/)).toHaveCount(3);
    expect(
      await page.evaluate(
        () => (window as unknown as { spinner: boolean }).spinner,
      ),
    ).toBe(false);

    await page.getByRole('button', { name: 'Previous day' }).click();
    await expect(page.getByText(/^return-\d$/)).toHaveCount(0);
    const label = await page
      .getByRole('button', { name: 'Select a date' })
      .textContent();
    await page.getByRole('button', { name: 'Polycord', exact: true }).click();
    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(
      page.getByRole('button', { name: 'Select a date' }),
    ).toHaveText(label ?? '');
    expect(await storage()).toBe(0);
    await context.close();
  });
});
