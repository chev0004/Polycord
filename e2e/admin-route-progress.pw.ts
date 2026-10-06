import { createHmac, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

test('opening admin from the navbar shows the route progress bar until the page settles', async ({
  browser,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  await sql`delete from users where discord_user_id = 'e2e-admin'`;
  const [owner] = await sql<{ id: string; discordUserId: string }[]>`
    insert into users (discord_user_id, discord_username, display_name)
    values ('e2e-admin', ${`${prefix}-owner`}, 'E2E Owner')
    returning id, discord_user_id as "discordUserId"`;
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
  const context = await browser.newContext({
    baseURL: 'http://localhost:3119',
  });
  await context.addCookies([
    {
      name: 'polycord_session',
      value: `${payload}.${signature}`,
      domain: 'localhost',
      path: '/',
    },
  ]);
  try {
    const page = await context.newPage();
    await page.goto('/en');
    await page.route(/\/en\/admin/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    const bar = page.locator(
      'div[aria-hidden="true"].fixed.pointer-events-none',
    );
    await expect(bar).toHaveClass(/opacity-0/);

    await page.getByRole('link', { name: /^Admin/ }).click();
    await expect(bar).toHaveClass(/opacity-100/);
    await expect(page).toHaveURL('/en/admin');
    await expect(bar).toHaveClass(/opacity-0/);
  } finally {
    await context.close();
    await sql`delete from users where id = ${owner.id}`;
    await sql.end();
  }
});
