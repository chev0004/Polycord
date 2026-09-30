import { createHmac, randomUUID } from 'node:crypto';
import { type BrowserContext, expect, test } from '@playwright/test';
import postgres from 'postgres';

const sql = postgres(process.env.TEST_DATABASE_URL as string);

type Person = { id: string; discord_user_id: string; display_name: string };

const signIn = async (context: BrowserContext, user: Person) => {
  const payload = Buffer.from(
    JSON.stringify({
      user: {
        id: user.discord_user_id,
        accountId: user.id,
        name: user.display_name,
        username: user.display_name,
      },
      expiresAt: Date.now() + 3600000,
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', 'polycord-isolated-audit-secret')
    .update(payload)
    .digest('base64url');
  await context.clearCookies();
  await context.addCookies([
    {
      name: 'polycord_session',
      value: `${payload}.${signature}`,
      domain: 'localhost',
      path: '/',
    },
  ]);
};

const stat = (page: import('@playwright/test').Page, label: string) =>
  page.getByText(label, { exact: true }).locator('xpath=preceding-sibling::p');

test.afterAll(() => sql.end());

test('mobile sheet views and copies reach Premium profile insights', async ({
  browser,
}) => {
  const [owner, viewer] = await sql<Person[]>`
    insert into users (discord_user_id, discord_username, display_name)
    values (${randomUUID().replaceAll('-', '')}, 'stats-owner', 'Stats owner'),
           (${randomUUID().replaceAll('-', '')}, 'stats-viewer', 'Stats viewer')
    returning id, discord_user_id, display_name`;
  try {
    await sql`
      insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio)
      values (now(), ${owner.id}, true, 'en', 'ja', 'beginner', 'A profile collecting received stats.'),
             (now(), ${viewer.id}, true, 'ja', 'en', 'beginner', 'A profile that views and copies.')`;
    await sql`insert into user_settings (user_id, profile_view_alert, product_analytics) values (${owner.id}, true, true), (${viewer.id}, false, false)`;
    await sql`insert into subscriptions (user_id, stripe_customer_id, status, current_period_end) values (${owner.id}, ${randomUUID()}, 'active', ${new Date(Date.now() + 3600000)})`;

    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    await signIn(context, viewer);
    await page.goto('/en');
    const view = page.waitForResponse('**/api/profile/view');
    await page
      .getByText('A profile collecting received stats.')
      .first()
      .click();
    const sheet = page.getByRole('dialog', { name: 'Stats owner' });
    await expect(sheet).toBeVisible();
    expect((await view).status()).toBe(204);
    const copy = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/notifications') &&
        response.request().method() === 'POST',
    );
    await sheet
      .getByRole('button', { name: "Copy Stats owner's username" })
      .click();
    expect((await copy).status()).toBe(200);

    await signIn(context, owner);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/profile');
    await expect(stat(page, 'Views (30d)').first()).toHaveText('1');
    await expect(stat(page, 'Copies (30d)').first()).toHaveText('1');
    await page
      .getByRole('button', { name: 'Notifications', exact: true })
      .click();
    await expect(
      page.getByText('Stats viewer copied your username'),
    ).toBeVisible();
    await context.close();
  } finally {
    await sql`delete from users where id in (${owner.id}, ${viewer.id})`;
  }
});
