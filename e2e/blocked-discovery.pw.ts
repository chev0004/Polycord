import { createHmac, randomUUID } from 'node:crypto';
import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import postgres from 'postgres';

const signIn = async (
  context: BrowserContext,
  user: { id: string; name: string },
  accountId: string,
) => {
  const payload = Buffer.from(
    JSON.stringify({
      user: { ...user, accountId },
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
};

const watchForName = (page: Page, name: string) =>
  page.addInitScript((name) => {
    new MutationObserver(() => {
      if (sessionStorage.getItem('blocked-watch') !== '1') return;
      for (const heading of document.querySelectorAll('article h3'))
        if (heading.textContent?.includes(name))
          sessionStorage.setItem('blocked-seen', location.href);
    }).observe(document, { childList: true, subtree: true });
  }, name);

const blockFromDiscovery = async (page: Page, name: string) => {
  const card = page
    .locator('article')
    .filter({ has: page.locator('h3', { hasText: name }) });
  await card.getByRole('button', { name: 'Card menu' }).first().click();
  const blocked = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/block') &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Block user', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Block user', exact: true })
    .click();
  expect((await blocked).status()).toBe(200);
  await expect(page.getByText('User blocked')).toBeVisible();
  await page.evaluate(() => sessionStorage.setItem('blocked-watch', '1'));
};

const expectNeverSeen = async (page: Page, name: string) => {
  await expect(page.locator('article').first()).toBeVisible();
  await expect(page.locator('article h3', { hasText: name })).toHaveCount(0);
  await page.waitForTimeout(1500);
  expect(
    await page.evaluate(() => sessionStorage.getItem('blocked-seen')),
  ).toBeNull();
};

for (const layout of ['mobile', 'desktop'] as const) {
  test(`blocked profiles stay out of discovery after navigating away on ${layout}`, async ({
    page,
    context,
  }) => {
    const sql = postgres(process.env.TEST_DATABASE_URL as string);
    const prefix = randomUUID().slice(0, 8);
    const identities = ['Viewer', 'Target', 'Other'].map((role) => ({
      id: `${prefix}-${role.toLowerCase()}`,
      name: `${role} ${prefix}`,
    }));
    const accounts: string[] = [];
    try {
      for (const [index, user] of identities.entries()) {
        const [account] =
          await sql`insert into users (discord_user_id, discord_username, display_name) values (${user.id}, ${user.id}, ${user.name}) returning id`;
        await sql`insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio) values (now() + ${`${index} minutes`}::interval, ${account.id}, true, 'en', 'ja', 'beginner', 'Blocked discovery navigation fixture.')`;
        accounts.push(account.id);
      }
      const target = identities[1].name;
      if (layout === 'mobile')
        await page.setViewportSize({ width: 390, height: 844 });
      await signIn(context, identities[0], accounts[0]);
      await watchForName(page, target);

      await page.goto('/en');
      await blockFromDiscovery(page, target);
      await expect(page.locator('article h3', { hasText: target })).toHaveCount(
        0,
      );

      const dock = page.getByRole('navigation', { name: 'Main' });
      const leaveDiscovery = async () => {
        if (layout === 'mobile') {
          await dock.getByRole('button', { name: 'Inbox' }).click();
          await expect(page).toHaveURL('/en/inbox');
          return;
        }
        await page
          .locator('article')
          .filter({ has: page.locator('h3', { hasText: identities[2].name }) })
          .getByRole('button', { name: 'Card menu' })
          .first()
          .click();
        await page
          .getByRole('button', { name: 'View profile', exact: true })
          .click();
        await expect(page).toHaveURL(/\/en\/u\//);
      };

      await leaveDiscovery();
      await page.goBack();
      await expect(page).toHaveURL('/en');
      await expectNeverSeen(page, target);
      await page.goForward();
      await page.goBack();
      await expectNeverSeen(page, target);

      const returnToDiscovery = async () => {
        if (layout === 'mobile')
          await dock.getByRole('button', { name: 'Discover' }).click();
        else await page.getByRole('button', { name: 'Polycord' }).click();
        await expect(page).toHaveURL('/en');
      };

      await leaveDiscovery();
      await returnToDiscovery();
      await expectNeverSeen(page, target);

      if (layout === 'mobile')
        await dock.getByRole('button', { name: 'Settings' }).click();
      else {
        await page.getByRole('button', { name: 'Account menu' }).click();
        await page
          .getByRole('button', { name: 'Settings', exact: true })
          .click();
      }
      await expect(page).toHaveURL('/en/settings');
      await page
        .getByRole('button', { name: /^Privacy/ })
        .first()
        .click();
      await page.getByRole('button', { name: /^Blocked accounts/ }).click();
      await page
        .getByRole('button', { name: `Unblock ${target}`, exact: true })
        .click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Unblock', exact: true })
        .click();
      await expect(
        page.getByText('You have no blocked accounts.'),
      ).toBeVisible();
      await page.evaluate(() => sessionStorage.removeItem('blocked-watch'));
      await returnToDiscovery();
      await expect(
        page.locator('article h3', { hasText: target }).first(),
      ).toBeVisible();

      await blockFromDiscovery(page, target);
      await page.goto('/en?sort=recent');
      await expectNeverSeen(page, target);
      await page.reload();
      await expectNeverSeen(page, target);
    } finally {
      await sql`delete from users where id in ${sql(accounts)}`;
      await sql.end();
    }
  });
}
