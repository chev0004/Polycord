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

test.describe('grouped suspicious activity', () => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  let owner: Account;
  let heavy: Account;
  let single: Account;

  const utcToday = sql`(date_trunc('day', now() at time zone 'utc') at time zone 'utc')`;

  test.beforeAll(async () => {
    await sql`delete from users where discord_user_id = 'e2e-admin'`;
    [owner, heavy, single] = await sql<Account[]>`
      insert into users (discord_user_id, discord_username, display_name)
      values ('e2e-admin', 'e2e-admin', 'E2E Owner'),
        (${`${prefix}-heavy`}, ${`${prefix}-heavy`}, ${`${prefix} Heavy`}),
        (${`${prefix}-single`}, ${`${prefix}-single`}, ${`${prefix} Single`})
      returning id, discord_user_id as "discordUserId"`;
    await sql`delete from suspicious_activity`;
    for (let index = 0; index < 6; index++)
      await sql`insert into suspicious_activity (user_id, action, ip, created_at) values (${heavy.id}, 'copy', '203.0.113.9', ${utcToday} + ${index + 1} * interval '1 minute')`;
    await sql`insert into suspicious_activity (user_id, action, ip, created_at) values (${single.id}, 'report', '198.51.100.4', ${utcToday} + interval '30 minutes')`;
  });

  test.afterAll(async () => {
    await sql`delete from suspicious_activity`;
    await sql`delete from users where id in ${sql([owner, heavy, single].map(({ id }) => id))}`;
    await sql.end();
  });

  test('long histories load in pages', async ({ browser }) => {
    const [deep] = await sql<Account[]>`
      insert into users (discord_user_id, discord_username, display_name)
      values (${`${prefix}-deep`}, ${`${prefix}-deep`}, ${`${prefix} Deep`})
      returning id, discord_user_id as "discordUserId"`;
    await sql`insert into suspicious_activity (user_id, action, ip, created_at)
      select ${deep.id}, 'bump', '192.0.2.8', now() - n * interval '1 second'
      from generate_series(1, 120) as n`;
    const context = await browser.newContext({
      baseURL: 'http://localhost:3119',
      viewport: { width: 1400, height: 900 },
    });
    await signIn(context, owner);
    const page = await context.newPage();
    await page.goto('/en/admin');
    await page.getByRole('tab', { name: /^Suspicious activity/ }).click();
    await page.getByText('120 flagged events').click();

    const events = page.getByText('192.0.2.8');
    const more = page.getByRole('button', { name: 'Show more events' });
    await expect(events).toHaveCount(51);
    await more.click();
    await expect(events).toHaveCount(101);
    await more.click();
    await expect(events).toHaveCount(121);
    await expect(more).toHaveCount(0);
    await context.close();
    await sql`delete from suspicious_activity where user_id = ${deep.id}`;
    await sql`delete from users where id = ${deep.id}`;
  });

  for (const [name, viewport, role] of [
    ['desktop', { width: 1400, height: 900 }, 'tab'],
    ['mobile', { width: 390, height: 844 }, 'button'],
  ] as const) {
    test(`${name} lists each user once and reveals every event`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        baseURL: 'http://localhost:3119',
        viewport,
        timezoneId: 'UTC',
      });
      await signIn(context, owner);
      const page = await context.newPage();
      await page.goto('/en/admin');
      await page.getByRole(role, { name: /^Suspicious activity/ }).click();

      await expect(page.getByText(`${prefix} Heavy`)).toHaveCount(1);
      await expect(page.getByText(`${prefix} Single`)).toHaveCount(1);
      await expect(page.getByText('Username copy limit exceeded')).toHaveCount(
        1,
      );
      await expect(page.getByText('6 flagged events')).toBeVisible();
      await expect(page.getByText(/flagged events/)).toHaveCount(1);

      await page.getByText('6 flagged events').click();
      await expect(page.getByText('Username copy limit exceeded')).toHaveCount(
        7,
      );
      await expect(page.getByText('203.0.113.9')).toHaveCount(7);
      await expect(
        page.getByRole('button', { name: /View user/ }).first(),
      ).toBeVisible();
      await context.close();
    });
  }
});
