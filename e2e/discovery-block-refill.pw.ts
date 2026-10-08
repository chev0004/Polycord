import { createHmac, randomUUID } from 'node:crypto';
import { expect, type Page, test } from '@playwright/test';
import postgres from 'postgres';

const PROFILES = 30;

const cardNames = (page: Page) => page.locator('article h3').allTextContents();

const blockFirstCard = async (page: Page) => {
  const card = page.locator('article').first();
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
};

for (const layout of ['desktop', 'mobile'] as const) {
  test(`blocking a full discovery page refills it without repeats on ${layout}`, async ({
    page,
    context,
  }) => {
    const sql = postgres(process.env.TEST_DATABASE_URL as string);
    const prefix = randomUUID().slice(0, 8);
    const accounts: string[] = [];
    try {
      const viewerId = `${prefix}-viewer`;
      const [viewer] =
        await sql`insert into users (discord_user_id, discord_username, display_name) values (${viewerId}, ${viewerId}, 'Viewer') returning id`;
      accounts.push(viewer.id);
      for (let index = 0; index < PROFILES; index++) {
        const name = `Card ${String(index).padStart(2, '0')} ${prefix}`;
        const [account] =
          await sql`insert into users (discord_user_id, discord_username, display_name) values (${`${prefix}-${index}`}, ${`${prefix}-${index}`}, ${name}) returning id`;
        await sql`insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio) values (now() - ${`${index} minutes`}::interval, ${account.id}, true, 'en', 'ja', 'beginner', 'Block refill fixture.')`;
        accounts.push(account.id);
      }
      const payload = Buffer.from(
        JSON.stringify({
          user: { id: viewerId, name: 'Viewer', accountId: viewer.id },
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
      if (layout === 'mobile')
        await page.setViewportSize({ width: 390, height: 844 });

      await page.goto('/en');
      await expect(page.locator('article')).toHaveCount(9);
      const firstPage = await cardNames(page);

      await page.addInitScript(() => {
        new MutationObserver(() => {
          if (
            sessionStorage.getItem('watching') === '1' &&
            document
              .querySelector('main')
              ?.innerText.includes('find any matches')
          )
            sessionStorage.setItem('emptied', '1');
        }).observe(document, { childList: true, subtree: true });
      });
      await page.reload();
      await expect(page.locator('article')).toHaveCount(9);
      if (layout === 'desktop') {
        await page.getByRole('button', { name: 'Next page' }).click();
        await expect(page.locator('article h3').first()).toContainText(
          'Card 09',
        );
        await page.getByRole('button', { name: 'Previous page' }).click();
        await expect(page.locator('article h3').first()).toContainText(
          'Card 00',
        );
      }
      await page.route('**/api/discovery?*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 6000));
        await route.continue();
      });

      await page.evaluate(() => sessionStorage.setItem('watching', '1'));
      for (let blocked = 1; blocked <= 9; blocked++) await blockFirstCard(page);
      await expect(page.locator('article')).toHaveCount(9);
      await page.unroute('**/api/discovery?*');
      expect(
        await page.evaluate(() => sessionStorage.getItem('emptied')),
      ).toBeNull();

      const refilled = await cardNames(page);
      expect(refilled).toHaveLength(9);
      expect(refilled.some((name) => firstPage.includes(name))).toBe(false);
      expect(new Set(refilled).size).toBe(9);
      expect(refilled[0]).toContain('Card 09');

      if (layout === 'desktop') {
        await page.evaluate((names) => {
          const titles = () =>
            Array.from(document.querySelectorAll('article h3'), (heading) =>
              (heading.textContent ?? '').trim(),
            );
          let previous = titles().join();
          new MutationObserver(() => {
            const current = titles();
            if (current.join() === previous) return;
            previous = current.join();
            if (current.some((title) => names.includes(title)))
              sessionStorage.setItem('repeated', '1');
          }).observe(document, { childList: true, subtree: true });
        }, refilled);
        await page.getByRole('button', { name: 'Next page' }).click();
        await expect(page.locator('article h3').first()).toContainText(
          'Card 18',
        );
        await expect(page.locator('article')).toHaveCount(9);
        expect(
          await page.evaluate(() => sessionStorage.getItem('repeated')),
        ).toBeNull();
      } else {
        await page.getByRole('button', { name: 'Show more partners' }).click();
        await expect(page.locator('article')).toHaveCount(18);
        const stacked = await cardNames(page);
        expect(new Set(stacked).size).toBe(18);
      }
    } finally {
      await sql`delete from users where id in ${sql(accounts)}`;
      await sql.end();
    }
  });
}
