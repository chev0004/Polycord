import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

test('returning to discovery shows cached results while the refresh is pending', async ({
  page,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const owners =
    await sql`insert into users (discord_user_id, discord_username, display_name)
    select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Cache ' || lpad(n::text, 2, '0') from generate_series(1, 4) n returning id`;
  const ids = owners.map((owner) => owner.id);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let held = false;
  try {
    await sql`insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio, tags)
      select now(), id, true, 'en', 'ja', 'intermediate', 'A cache fixture.', array[${prefix}] from users where id in ${sql(ids)}`;
    await page.route('**/api/discovery/bootstrap?*', async (route) => {
      if (held) await gate;
      await route.continue().catch(() => {});
    });
    const url = `/en?tag=${prefix}`;
    await page.goto(url);
    await expect(page.locator('article')).toHaveCount(4);
    await page.evaluate(() => {
      (
        window as unknown as {
          next: { router: { push: (to: string) => void } };
        }
      ).next.router.push('/en/legal');
    });
    await expect(page).toHaveURL(/\/en\/legal$/);
    await sql`update users set display_name = ${`${prefix} Fresh 01`} where id = ${ids[0]}`;
    held = true;
    await page.evaluate((to) => {
      (
        window as unknown as {
          next: { router: { push: (to: string) => void } };
        }
      ).next.router.push(to);
    }, url);
    await expect(page.locator('article')).toHaveCount(4);
    await expect(page.locator('main .skeleton-shimmer')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: `${prefix} Cache 01` }),
    ).toBeVisible();
    release();
    await expect(
      page.getByRole('heading', { name: `${prefix} Fresh 01` }),
    ).toBeVisible();
    await expect(page.locator('article')).toHaveCount(4);

    held = true;
    const cold = new Promise<void>(() => {});
    await page.route('**/api/discovery/bootstrap?*', async (route) => {
      await cold;
      await route.continue().catch(() => {});
    });
    await page.reload({ waitUntil: 'commit' });
    await expect(page.locator('main .skeleton-shimmer').first()).toBeAttached();
    await expect(page.getByRole('heading', { name: prefix })).toHaveCount(0);
  } finally {
    release();
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await sql`delete from users where id in ${sql(ids)}`;
    await sql.end();
  }
});
