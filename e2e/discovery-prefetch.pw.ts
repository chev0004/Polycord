import { randomUUID } from 'node:crypto';
import { expect, type Page, test } from '@playwright/test';
import postgres from 'postgres';

const PROFILES = 30;
const SLOW_MS = 4000;

const seed = async (sql: postgres.Sql, prefix: string) => {
  const accounts: string[] = [];
  for (let index = 0; index < PROFILES; index++) {
    const [account] =
      await sql`insert into users (discord_user_id, discord_username, display_name) values (${`${prefix}-${index}`}, ${`${prefix}-${index}`}, ${`Card ${String(index).padStart(2, '0')} ${prefix}`}) returning id`;
    await sql`insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio, tags) values (now() - ${`${index} minutes`}::interval, ${account.id}, true, 'en', 'ja', 'beginner', 'Prefetch fixture.', array[${prefix}])`;
    accounts.push(account.id);
  }
  return accounts;
};

const watchPageTwo = (page: Page) => {
  const urls: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/api/discovery?') && url.includes('page=2'))
      urls.push(url);
  });
  return urls;
};

const scrollToBottom = (page: Page) =>
  page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );

for (const layout of ['desktop', 'mobile'] as const) {
  test(`discovery prefetches the next page near the bottom on ${layout}`, async ({
    page,
  }) => {
    const sql = postgres(process.env.TEST_DATABASE_URL as string);
    const prefix = randomUUID().slice(0, 8);
    const accounts: string[] = [];
    try {
      accounts.push(...(await seed(sql, prefix)));
      await page.setViewportSize(
        layout === 'mobile'
          ? { width: 390, height: 600 }
          : { width: 1280, height: 600 },
      );
      const pageTwo = watchPageTwo(page);

      await page.goto(`/en?tag=${prefix}`);
      await expect(page.locator('article')).toHaveCount(9);
      await page.waitForTimeout(1500);
      expect(pageTwo).toHaveLength(0);

      const prefetched = page.waitForResponse(
        (response) =>
          response.url().includes('/api/discovery?') &&
          response.url().includes('page=2'),
      );
      await scrollToBottom(page);
      expect((await prefetched).status()).toBe(200);
      expect(pageTwo).toHaveLength(1);
      if (layout === 'mobile') expect(pageTwo[0]).toContain('stack=1');

      await page.route('**/api/discovery?*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, SLOW_MS));
        await route.continue().catch(() => {});
      });
      const started = Date.now();
      if (layout === 'desktop') {
        await page.getByRole('button', { name: 'Next page' }).click();
        await expect(page.locator('article h3').first()).toContainText(
          'Card 09',
          { timeout: 1500 },
        );
        await expect(page.locator('article')).toHaveCount(9);
      } else {
        await page.getByRole('button', { name: 'Show more partners' }).click();
        await expect(page.locator('article')).toHaveCount(18, {
          timeout: 1500,
        });
      }
      expect(Date.now() - started).toBeLessThan(SLOW_MS);
      expect(pageTwo).toHaveLength(1);
    } finally {
      await page.unrouteAll({ behavior: 'ignoreErrors' });
      await sql`delete from users where id in ${sql(accounts)}`;
      await sql.end();
    }
  });
}

test('a tall viewport does not prefetch before scrolling', async ({ page }) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const accounts: string[] = [];
  try {
    accounts.push(...(await seed(sql, prefix)));
    await page.setViewportSize({ width: 1280, height: 1080 });
    const pageTwo = watchPageTwo(page);
    await page.goto(`/en?tag=${prefix}`);
    await expect(page.locator('article')).toHaveCount(9);
    await page.waitForTimeout(1500);
    expect(pageTwo).toHaveLength(0);
  } finally {
    await sql`delete from users where id in ${sql(accounts)}`;
    await sql.end();
  }
});

test('a sort change prefetches its own next page', async ({ page }) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const accounts: string[] = [];
  try {
    accounts.push(...(await seed(sql, prefix)));
    await page.setViewportSize({ width: 1280, height: 600 });
    const pageTwo = watchPageTwo(page);
    await page.goto(`/en?tag=${prefix}`);
    await expect(page.locator('article')).toHaveCount(9);
    await scrollToBottom(page);
    await expect.poll(() => pageTwo.length).toBe(1);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole('button', { name: 'Sort', exact: true }).click();
    await page.getByRole('button', { name: 'Oldest bumped' }).click();
    await expect(page.locator('article h3').first()).toContainText('Card 29');
    await scrollToBottom(page);
    await expect.poll(() => pageTwo.length).toBe(2);
    expect(pageTwo[0]).not.toBe(pageTwo[1]);
  } finally {
    await sql`delete from users where id in ${sql(accounts)}`;
    await sql.end();
  }
});
