import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

for (const width of [1280, 390]) {
  test(`a refreshed cache snapshot keeps the scroll position at ${width}px`, async ({
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
      await sql`insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio, tags)
        select now(), id, true, 'en', 'ja', 'intermediate', repeat('A scroll fixture. ', 12), array[${prefix}] from users where id in ${sql(ids)}`;
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
      await push('/en/legal');
      await expect(page).toHaveURL(/\/en\/legal$/);
      held = true;
      await page.evaluate((href) => {
        sessionStorage.setItem(
          'polycord:discovery-return',
          JSON.stringify({ href, scrollY: 200 }),
        );
      }, url);
      await push(url);
      await expect(page.locator('article')).toHaveCount(9);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(200);
      await page.mouse.wheel(0, 500);
      await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBeGreaterThan(400);
      const before = await page.evaluate(() => window.scrollY);
      const moves = await page.evaluate(() => {
        const log: number[] = [];
        window.addEventListener('scroll', () => log.push(window.scrollY));
        (window as unknown as { scrollLog: number[] }).scrollLog = log;
        return log;
      });
      expect(moves).toEqual([]);
      release();
      await expect(page.locator('div.fixed.top-0.h-1')).toHaveClass(
        /opacity-0/,
      );
      await page.waitForTimeout(1000);
      expect(await page.evaluate(() => window.scrollY)).toBe(before);
      expect(
        await page.evaluate(
          () => (window as unknown as { scrollLog: number[] }).scrollLog,
        ),
      ).toEqual([]);
    } finally {
      release();
      await page.unrouteAll({ behavior: 'ignoreErrors' });
      await sql`delete from users where id in ${sql(ids)}`;
      await sql.end();
    }
  });
}
