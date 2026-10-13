import { createHmac, randomUUID } from 'node:crypto';
import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import postgres from 'postgres';

const signIn = async (
  context: BrowserContext,
  user: { id: string; name: string; username: string },
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

for (const layout of ['desktop', 'mobile'] as const) {
  test.describe(layout, () => {
    const saveProfileLabel = layout === 'mobile' ? 'Save' : 'Save Profile';
    test.use({
      viewport:
        layout === 'mobile'
          ? { width: 390, height: 844 }
          : { width: 1280, height: 900 },
    });

    test('a cached discovery visit ends on the saved profile and newer bumps', async ({
      page,
      context,
    }, testInfo) => {
      const sql = postgres(process.env.TEST_DATABASE_URL as string);
      const prefix = randomUUID().slice(0, 8);
      const viewer = {
        id: randomUUID().replaceAll('-', ''),
        name: `${prefix} Viewer`,
        username: `viewer.${prefix}`,
      };
      const ids: string[] = [];
      let release: () => void = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let held = false;
      const bar = page.locator('div.fixed.top-0.h-1');
      const push = (to: string) =>
        page.evaluate((target) => {
          (
            window as unknown as {
              next: { router: { push: (to: string) => void } };
            }
          ).next.router.push(target);
        }, to);
      try {
        const [account] =
          await sql`insert into users (discord_user_id, discord_username, display_name) values (${viewer.id}, ${viewer.username}, ${viewer.name}) returning id`;
        ids.push(account.id);
        const others =
          await sql`insert into users (discord_user_id, discord_username, display_name)
      select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Other ' || lpad(n::text, 2, '0') from generate_series(1, 3) n returning id`;
        ids.push(...others.map((other) => other.id));
        await sql`insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio, tags, country, timezone)
      select now() - interval '1 hour', id, true, 'en', 'ja', 'intermediate', 'Original bio ' || ${prefix}, array[${prefix}], 'JP', 'Asia/Tokyo' from users where id in ${sql(ids)}`;
        await signIn(context, viewer, account.id);
        await page.route('**/api/discovery/bootstrap?*', async (route) => {
          if (held) await gate;
          await route.continue().catch(() => {});
        });
        await page.route('**/api/discovery?*', async (route) => {
          if (held) await gate;
          await route.continue().catch(() => {});
        });

        const url = `/en?tag=${prefix}`;
        await page.goto(url);
        await expect(page.locator('article')).toHaveCount(4);
        await expect(
          page.getByText(`Original bio ${prefix}`).first(),
        ).toBeVisible();

        await push('/en/profile');
        await expect(page).toHaveURL(/\/en\/profile$/);
        await page
          .getByLabel('Bio', { exact: true })
          .fill(`Edited bio ${prefix}`);
        await page
          .getByRole('button', { name: saveProfileLabel, exact: true })
          .click();
        await expect(
          page.getByRole('button', { name: saveProfileLabel, exact: true }),
        ).toHaveCount(0);
        await sql`update profiles set last_bumped_at = now() where user_id = ${others[0].id}`;

        held = true;
        await push(url);
        await expect(page.locator('article')).toHaveCount(4);
        await expect(
          page.getByText(`Original bio ${prefix}`).first(),
        ).toBeVisible();
        await expect(bar).toHaveClass(/opacity-100/);
        await page.screenshot({
          path: testInfo.outputPath(`cached-refresh-${layout}.png`),
          animations: 'disabled',
        });
        release();
        await expect(page.getByText(`Edited bio ${prefix}`)).toBeVisible();
        await expect(bar).toHaveClass(/opacity-0/);
        await expect(page.getByText(`Original bio ${prefix}`)).toHaveCount(3);
        await expect(page.locator('article').first()).toContainText(
          `${prefix} Other 01`,
        );
      } finally {
        release();
        await page.unrouteAll({ behavior: 'ignoreErrors' });
        await sql`delete from users where id in ${sql(ids)}`;
        await sql.end();
      }
    });

    test('a prefetched discovery page is refreshed on the next visit after a profile edit', async ({
      page,
      context,
    }) => {
      const visibleProfiles = layout === 'mobile' ? 12 : 3;
      const sql = postgres(process.env.TEST_DATABASE_URL as string);
      const prefix = randomUUID().slice(0, 8);
      const viewer = {
        id: randomUUID().replaceAll('-', ''),
        name: `${prefix} Viewer`,
        username: `viewer.${prefix}`,
      };
      const ids: string[] = [];
      let release: () => void = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let held = false;
      const bar = page.locator('div.fixed.top-0.h-1');
      const push = (to: string) =>
        page.evaluate((target) => {
          (
            window as unknown as {
              next: { router: { push: (to: string) => void } };
            }
          ).next.router.push(target);
        }, to);
      try {
        const [account] =
          await sql`insert into users (discord_user_id, discord_username, display_name) values (${viewer.id}, ${viewer.username}, ${viewer.name}) returning id`;
        ids.push(account.id);
        const others =
          await sql`insert into users (discord_user_id, discord_username, display_name)
      select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Other ' || lpad(n::text, 2, '0') from generate_series(1, 11) n returning id`;
        ids.push(...others.map((other) => other.id));
        await sql`insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio, tags, country, timezone)
      select now() - interval '1 hour' + n * interval '1 minute', id, true, 'en', 'ja', 'intermediate', 'Original bio ' || ${prefix}, array[${prefix}], 'JP', 'Asia/Tokyo'
      from (select id, row_number() over (order by display_name) n from users where id in ${sql(ids)}) u`;
        await sql`update profiles set last_bumped_at = now() - interval '2 hours' where user_id = ${account.id}`;
        await signIn(context, viewer, account.id);
        await page.route('**/api/discovery?*', async (route) => {
          if (held) await gate;
          await route.continue().catch(() => {});
        });
        await page.route('**/api/discovery/bootstrap?*', async (route) => {
          if (held) await gate;
          await route.continue().catch(() => {});
        });

        const second = `/en?tag=${prefix}&page=2`;
        const prefetched = page.waitForResponse((response) =>
          response.url().includes('page=2'),
        );
        await page.goto(`/en?tag=${prefix}`);
        await expect(page.locator('article')).toHaveCount(9);
        await page.evaluate(() =>
          window.scrollTo(0, document.body.scrollHeight),
        );
        await prefetched;
        await page.waitForTimeout(300);
        await push(second);
        await expect(page.getByText(`Original bio ${prefix}`)).toHaveCount(
          visibleProfiles,
        );

        await push('/en/profile');
        await expect(page).toHaveURL(/\/en\/profile$/);
        await page
          .getByLabel('Bio', { exact: true })
          .fill(`Edited bio ${prefix}`);
        await page
          .getByRole('button', { name: saveProfileLabel, exact: true })
          .click();
        await expect(
          page.getByRole('button', { name: saveProfileLabel, exact: true }),
        ).toHaveCount(0);

        held = true;
        await push(second);
        await expect(page.getByText(`Original bio ${prefix}`)).toHaveCount(
          visibleProfiles,
        );
        await expect(bar).toHaveClass(/opacity-100/);
        release();
        await expect(page.getByText(`Edited bio ${prefix}`)).toBeVisible();
        await expect(bar).toHaveClass(/opacity-0/);
      } finally {
        release();
        await page.unrouteAll({ behavior: 'ignoreErrors' });
        await sql`delete from users where id in ${sql(ids)}`;
        await sql.end();
      }
    });
    const choose = async (page: Page, label: string, option: string) => {
      await page.getByRole('combobox', { name: label, exact: true }).click();
      await page.getByRole('option', { name: option, exact: true }).click();
    };

    test('cached discovery visits end on a bump and a language names setting', async ({
      page,
      context,
    }) => {
      const sql = postgres(process.env.TEST_DATABASE_URL as string);
      const prefix = randomUUID().slice(0, 8);
      const viewer = {
        id: randomUUID().replaceAll('-', ''),
        name: `${prefix} Viewer`,
        username: `viewer.${prefix}`,
      };
      const ids: string[] = [];
      let release: () => void = () => {};
      let gate = Promise.resolve();
      const hold = () => {
        gate = new Promise<void>((resolve) => {
          release = resolve;
        });
      };
      let held = false;
      const bar = page.locator('div.fixed.top-0.h-1');
      const push = (to: string) =>
        page.evaluate((target) => {
          (
            window as unknown as {
              next: { router: { push: (to: string) => void } };
            }
          ).next.router.push(target);
        }, to);
      const returnHeld = async (url: string) => {
        hold();
        held = true;
        await push(url);
        await expect(page.locator('article')).toHaveCount(4);
        await expect(bar).toHaveClass(/opacity-100/);
      };
      const releaseRefresh = async () => {
        release();
        held = false;
        await expect(bar).toHaveClass(/opacity-0/);
      };
      try {
        const [account] =
          await sql`insert into users (discord_user_id, discord_username, display_name, email) values (${viewer.id}, ${viewer.username}, ${viewer.name}, 'cache@example.com') returning id`;
        ids.push(account.id);
        const others =
          await sql`insert into users (discord_user_id, discord_username, display_name)
      select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Other ' || lpad(n::text, 2, '0') from generate_series(1, 3) n returning id`;
        ids.push(...others.map((other) => other.id));
        await sql`insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio, tags, country, timezone)
      select now() - interval '1 hour', id, true, 'ja', 'en', 'intermediate', 'A cache fixture.', array[${prefix}], 'JP', 'Asia/Tokyo' from users where id in ${sql(ids)}`;
        await sql`update profiles set last_bumped_at = now() - interval '4 hours' where user_id = ${account.id}`;
        await signIn(context, viewer, account.id);
        for (const pattern of [
          '**/api/discovery/bootstrap?*',
          '**/api/discovery?*',
        ])
          await page.route(pattern, async (route) => {
            if (held) await gate;
            await route.continue().catch(() => {});
          });

        const url = `/en?tag=${prefix}`;
        await page.goto(url);
        await expect(page.locator('article')).toHaveCount(4);
        await expect(page.locator('article').first()).toContainText('Japanese');
        await expect(page.locator('article').last()).toContainText(viewer.name);

        if (layout === 'mobile') {
          await push('/en/settings');
          await page
            .getByRole('main')
            .getByRole('button', { name: /^Language Names/ })
            .click();
          const saved = page.waitForResponse(
            (response) =>
              response.url().endsWith('/api/settings') &&
              response.request().method() === 'POST',
          );
          await page
            .getByRole('dialog')
            .getByRole('button', { name: 'Short codes', exact: true })
            .click();
          expect((await saved).status()).toBe(200);
        } else {
          await push('/en/settings#appearance');
          await choose(page, 'Language Names', 'Short codes');
          await page
            .getByRole('button', { name: 'Save Settings', exact: true })
            .click();
          await expect(
            page.getByRole('button', { name: 'Save Settings', exact: true }),
          ).toHaveCount(0);
        }
        await returnHeld(url);
        await expect(page.locator('article').first()).toContainText('Japanese');
        await releaseRefresh();
        await expect(page.locator('article').first()).not.toContainText(
          'Japanese',
        );
        await expect(page.locator('article').first()).toContainText('JA');

        await push('/en/profile');
        await expect(page).toHaveURL(/\/en\/profile$/);
        await page.getByRole('button', { name: 'Profile options' }).click();
        await page
          .getByRole('button', { name: 'Bump profile', exact: true })
          .click();
        await expect(
          page.getByText('Your profile is back at the top of Discover.'),
        ).toBeVisible();
        await returnHeld(url);
        await expect(page.locator('article').last()).toContainText(viewer.name);
        await releaseRefresh();
        await expect(page.locator('article').first()).toContainText(
          viewer.name,
        );
        await expect(page.locator('article').first()).toContainText('just now');
      } finally {
        release();
        await page.unrouteAll({ behavior: 'ignoreErrors' });
        await sql`delete from users where id in ${sql(ids)}`;
        await sql.end();
      }
    });
  });
}
