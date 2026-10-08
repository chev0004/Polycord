import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

test.skip(
  process.env.NEXT_PUBLIC_DISCOVERY_SKELETON_ENABLED !== 'false',
  'bar-only loading is a build-time setting',
);

test('bar-only loading shows no skeleton or early controls', async ({
  page,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const owners =
    await sql`insert into users (discord_user_id, discord_username, display_name)
    select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Bar ' || lpad(n::text, 2, '0') from generate_series(1, 4) n returning id`;
  const ids = owners.map((owner) => owner.id);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let releaseFilter: () => void = () => {};
  const filterGate = new Promise<void>((resolve) => {
    releaseFilter = resolve;
  });
  const bar = page.locator('div.fixed.top-0.h-1');
  try {
    await sql`insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio, tags)
      select now(), id, true, 'en', 'ja', 'intermediate', 'A bar only fixture.', array[${prefix}] from users where id in ${sql(ids)}`;
    await page.route('**/api/discovery/bootstrap?*', async (route) => {
      await gate;
      await route.continue().catch(() => {});
    });
    await page.goto(`/en?tag=${prefix}`, { waitUntil: 'commit' });
    await expect(bar).toHaveClass(/opacity-100/);
    await expect(page.locator('main .skeleton-shimmer')).toHaveCount(0);
    await expect(page.locator('article')).toHaveCount(0);
    await expect(page.getByRole('textbox')).toHaveCount(0);
    release();
    await expect(page.locator('article')).toHaveCount(4);
    await expect(page.getByRole('textbox').first()).toBeVisible();
    await expect(bar).toHaveClass(/opacity-0/);

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
  } finally {
    release();
    releaseFilter();
    await page.unrouteAll({ behavior: 'wait' });
    await sql`delete from users where id in ${sql(ids)}`;
    await sql.end();
  }
});
