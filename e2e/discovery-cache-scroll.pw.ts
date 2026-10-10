import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

for (const status of [200, 503]) {
  test(`cached pagination preserves scrolling after a ${status} refresh`, async ({
    page,
  }) => {
    const sql = postgres(process.env.TEST_DATABASE_URL as string);
    const prefix = randomUUID().slice(0, 8);
    const owners =
      await sql`insert into users (discord_user_id, discord_username, display_name)
      select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Page ' || lpad(n::text, 2, '0') from generate_series(1, 18) n returning id`;
    const ids = owners.map((owner) => owner.id);
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    try {
      await sql`insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio, tags)
        select now(), id, true, 'en', 'ja', 'intermediate', repeat('A pagination fixture. ', 12), array[${prefix}] from users where id in ${sql(ids)}`;
      await page.setViewportSize({ width: 1280, height: 700 });
      await page.goto(`/en?tag=${prefix}&sort=name-desc`);
      await expect(page.locator('article')).toHaveCount(9);
      const bar = page.locator('div.fixed.top-0.h-1');
      await expect(bar).toHaveClass(/opacity-0/);
      await page
        .getByRole('button', { name: 'Next page', exact: true })
        .click();
      await expect(
        page.getByRole('heading', { name: `${prefix} Page 09`, exact: true }),
      ).toBeAttached();
      await expect(bar).toHaveClass(/opacity-0/);
      await page
        .getByRole('button', { name: 'Previous page', exact: true })
        .click();
      await expect(
        page.getByRole('heading', { name: `${prefix} Page 18`, exact: true }),
      ).toBeAttached();
      await expect(bar).toHaveClass(/opacity-0/);
      await page
        .getByRole('button', { name: 'Next page', exact: true })
        .click();
      await expect(
        page.getByRole('heading', { name: `${prefix} Page 09`, exact: true }),
      ).toBeAttached();
      await expect(bar).toHaveClass(/opacity-0/);
      await sql`update users set display_name = ${`${prefix} Page 18 Fresh`} where discord_user_id = ${`${prefix}-18`}`;
      await page.route('**/api/discovery?*', async (route) => {
        await gate;
        if (status === 503) await route.fulfill({ status, body: '{}' });
        else await route.continue();
      });
      await page
        .getByRole('button', { name: 'Previous page', exact: true })
        .click();
      await expect(
        page.getByRole('heading', { name: `${prefix} Page 18`, exact: true }),
      ).toBeAttached();
      await expect(bar).toHaveClass(/opacity-100/);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      await page.mouse.move(0, 0);
      await page.mouse.wheel(0, 600);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(600);
      const before = await page.evaluate(() => window.scrollY);
      release();
      if (status === 200)
        await expect(
          page.getByRole('heading', {
            name: `${prefix} Page 18 Fresh`,
            exact: true,
          }),
        ).toBeAttached();
      else
        await expect(page.getByRole('main').getByRole('alert')).toContainText(
          "We couldn't load profiles",
        );
      await expect(bar).toHaveClass(/opacity-0/);
      await page.waitForTimeout(500);
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(400);
      if (status === 200)
        expect(await page.evaluate(() => window.scrollY)).toBe(before);
    } finally {
      release();
      await page.unrouteAll({ behavior: 'ignoreErrors' });
      await sql`delete from users where id in ${sql(ids)}`;
      await sql.end();
    }
  });
}

for (const [width, restore] of [
  [1280, false],
  [390, false],
  [1280, true],
  [390, true],
] as const) {
  test(`returning from a profile preserves scrolling at ${width}px with restoration ${restore}`, async ({
    page,
  }) => {
    const sql = postgres(process.env.TEST_DATABASE_URL as string);
    const prefix = randomUUID().slice(0, 8);
    const owners =
      await sql`insert into users (discord_user_id, discord_username, display_name)
      select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Scroll ' || lpad(n::text, 2, '0') from generate_series(1, 9) n returning id`;
    const ids = owners.map((owner) => owner.id);
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let held = false;
    try {
      const profiles =
        await sql`insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio, tags)
        select now(), id, true, 'en', 'ja', 'intermediate', repeat('A scroll fixture. ', 12), array[${prefix}] from users where id in ${sql(ids)} returning id`;
      await page.setViewportSize({ width, height: 700 });
      await page.route('**/api/discovery/bootstrap?*', async (route) => {
        if (held) await gate;
        await route.continue().catch(() => {});
      });
      const url = `/en?tag=${prefix}`;
      await page.goto(url);
      await expect(page.locator('article')).toHaveCount(9);
      const push = (to: string) =>
        page.evaluate((target) => {
          (
            window as unknown as {
              next: { router: { push: (to: string) => void } };
            }
          ).next.router.push(target);
        }, to);
      const profileUrl = `/en/u/${profiles[0].id}?from=${encodeURIComponent(url)}`;
      await push(profileUrl);
      await expect(page).toHaveURL(profileUrl);
      held = true;
      if (restore)
        await page.evaluate((href) => {
          sessionStorage.setItem(
            'polycord:discovery-return',
            JSON.stringify({ href, scrollY: 200 }),
          );
        }, url);
      await page
        .getByRole('button', { name: 'Back to discovery', exact: true })
        .click();
      await expect(page.locator('article')).toHaveCount(9);
      await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBe(restore ? 200 : 0);
      await page.mouse.move(0, 0);
      await page.mouse.wheel(0, 500);
      await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBe((restore ? 200 : 0) + 500);
      const name = await page.evaluate(
        () =>
          [...document.querySelectorAll('article')]
            .find((card) => card.getBoundingClientRect().bottom > 100)
            ?.querySelector('h3')?.textContent ?? '',
      );
      const card = page.locator('article').filter({ hasText: name });
      const top = () =>
        card.evaluate((el) => Math.round(el.getBoundingClientRect().top));
      const before = await top();
      const refreshed = page.waitForResponse('**/api/discovery/bootstrap?*');
      release();
      await refreshed;
      await expect(page.locator('div.fixed.top-0.h-1')).toHaveClass(
        /opacity-0/,
      );
      await page.waitForTimeout(1000);
      expect(Math.abs((await top()) - before)).toBeLessThanOrEqual(2);
    } finally {
      release();
      await page.unrouteAll({ behavior: 'ignoreErrors' });
      await sql`delete from users where id in ${sql(ids)}`;
      await sql.end();
    }
  });
}
