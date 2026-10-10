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

const card = (page: Page, name: string) =>
  page
    .locator('article')
    .filter({ has: page.locator('h3', { hasText: name }) });

for (const layout of ['desktop', 'mobile'] as const) {
  test(`blocking from discovery updates in place on ${layout}`, async ({
    page,
    context,
  }) => {
    const sql = postgres(process.env.TEST_DATABASE_URL as string);
    const prefix = `Inplace${randomUUID().slice(0, 6)}`;
    const identities = ['Viewer', 'Target', 'Other'].map((role) => ({
      id: `${prefix}-${role.toLowerCase()}`,
      name: `${prefix} ${role}`,
    }));
    const accounts: string[] = [];
    try {
      for (const [index, user] of identities.entries()) {
        const [account] =
          await sql`insert into users (discord_user_id, discord_username, display_name) values (${user.id}, ${user.id}, ${user.name}) returning id`;
        await sql`insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio) values (now() + ${`${index} minutes`}::interval, ${account.id}, true, 'en', 'ja', 'beginner', 'Block in place fixture.')`;
        accounts.push(account.id);
      }
      if (layout === 'mobile')
        await page.setViewportSize({ width: 390, height: 844 });
      await signIn(context, identities[0], accounts[0]);

      const reloads: string[] = [];
      page.on('request', (request) => {
        const { pathname } = new URL(request.url());
        if (
          pathname.startsWith('/api/discovery') ||
          request.isNavigationRequest()
        )
          reloads.push(`${request.method()} ${pathname}`);
      });
      const url = `/en?q=${encodeURIComponent(prefix)}`;
      await page.goto(url);
      const target = identities[1].name;
      await expect(card(page, target)).toBeVisible();
      await page.evaluate(() => {
        (window as unknown as { alive: boolean }).alive = true;
      });
      reloads.length = 0;

      const block = async () => {
        await card(page, target)
          .getByRole('button', { name: 'Card menu' })
          .first()
          .click();
        await page
          .getByRole('button', { name: 'Block user', exact: true })
          .click();
        await page
          .getByRole('dialog', { name: /^Block .+\?$/ })
          .getByRole('button', { name: 'Block user', exact: true })
          .click();
      };
      const settled = async () => {
        await page.waitForTimeout(1000);
        expect(reloads).toEqual([]);
        expect(
          await page.evaluate(
            () => (window as unknown as { alive?: boolean }).alive,
          ),
        ).toBe(true);
        expect(page.url()).toContain(`q=${prefix}`);
        await expect(card(page, identities[2].name)).toBeVisible();
      };

      await page.route(
        '**/api/block',
        (route) => route.fulfill({ status: 500 }),
        {
          times: 1,
        },
      );
      await block();
      await expect(page.getByText("Couldn't block user")).toBeVisible();
      await expect(card(page, target)).toBeVisible();
      await settled();

      await block();
      await expect(page.getByText('User blocked')).toBeVisible();
      await expect(card(page, target)).toHaveCount(0);
      await settled();

      if (layout === 'mobile') return;
      await page.getByRole('button', { name: 'Undo' }).click();
      await expect(card(page, target)).toBeVisible();
      await settled();
    } finally {
      await sql`delete from users where id in ${sql(accounts)}`;
      await sql.end();
    }
  });
}
