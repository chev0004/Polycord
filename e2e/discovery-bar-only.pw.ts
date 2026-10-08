import { randomUUID } from 'node:crypto';
import { expect, type Page, test } from '@playwright/test';
import postgres from 'postgres';

test.skip(
  process.env.NEXT_PUBLIC_DISCOVERY_SKELETON_ENABLED !== 'false',
  'bar-only loading is a build-time setting',
);

const sql = postgres(process.env.TEST_DATABASE_URL as string);
const prefix = randomUUID().slice(0, 8);
let ids: string[];
let release: () => void = () => {};
let releaseFilter: () => void = () => {};

test.beforeAll(async () => {
  const owners =
    await sql`insert into users (discord_user_id, discord_username, display_name)
    select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Bar ' || lpad(n::text, 2, '0') from generate_series(1, 4) n returning id`;
  ids = owners.map((owner) => owner.id);
  await sql`insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio, tags)
    select now(), id, true, 'en', 'ja', 'intermediate', 'A bar only fixture.', array[${prefix}] from users where id in ${sql(ids)}`;
});

test.afterAll(async () => {
  await sql`delete from users where id in ${sql(ids)}`;
  await sql.end();
});

const gateBootstrap = async (page: Page) => {
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/discovery/bootstrap?*', async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
};

test.afterEach(async ({ page }) => {
  release();
  releaseFilter();
  await page.unrouteAll({ behavior: 'wait' });
});

test('a fresh load paints nothing until discovery is ready', async ({
  page,
}) => {
  const bar = page.locator('div.fixed.top-0.h-1');
  await gateBootstrap(page);
  await page.goto(`/en?tag=${prefix}`, { waitUntil: 'commit' });
  await expect(bar).toHaveClass(/opacity-100/);
  await expect(page.locator('main .skeleton-shimmer')).toHaveCount(0);
  await expect(page.locator('article')).toHaveCount(0);
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.locator('footer')).toBeHidden();
  await expect(page.getByRole('navigation')).toBeHidden();
  release();
  await expect(page.locator('article')).toHaveCount(4);
  await expect(page.getByRole('textbox').first()).toBeVisible();
  await expect(page.locator('footer')).toBeVisible();
  await expect(bar).toHaveClass(/opacity-0/);

  const filterGate = new Promise<void>((resolve) => {
    releaseFilter = resolve;
  });
  await page.route('**/api/discovery?*', async (route) => {
    await filterGate;
    await route.continue().catch(() => {});
  });
  await page.getByRole('textbox').first().fill(`${prefix} Bar 01`);
  await expect(bar).toHaveClass(/opacity-100/);
  await expect(page.locator('main .skeleton-shimmer')).toHaveCount(0);
  await expect(page.locator('article')).toHaveCount(4);
  releaseFilter();
  await expect(page.locator('article')).toHaveCount(1);
  await expect(bar).toHaveClass(/opacity-0/);
});

test('navigating into discovery keeps the previous page until it is ready', async ({
  page,
}) => {
  await page.goto('/en/legal');
  const legalHeading = page.getByRole('heading', { level: 1 });
  await expect(legalHeading).toBeVisible();
  const heading = await legalHeading.innerText();
  await gateBootstrap(page);
  await page
    .getByRole('contentinfo')
    .getByRole('link', { name: 'Discovery' })
    .click();
  await page.waitForTimeout(1000);
  await expect(page).toHaveURL(/\/en\/legal$/);
  await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  await expect(page.locator('article')).toHaveCount(0);
  release();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator('article').first()).toBeVisible();
  await expect(page.locator('footer')).toBeVisible();
});
