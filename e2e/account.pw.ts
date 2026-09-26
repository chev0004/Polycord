import { createHmac, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

test('deleted sessions cannot read, write, or recreate an account', async ({
  browser,
  page,
}, testInfo) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const discordId = randomUUID().replaceAll('-', '');
  const accountId = randomUUID();
  const replacementId = randomUUID();
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const cookie = (id: string) => {
    const payload = Buffer.from(
      JSON.stringify({
        user: { id: discordId, accountId: id, name: 'Deletion test' },
        expiresAt: Date.now() + 3600000,
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', 'polycord-isolated-audit-secret')
      .update(payload)
      .digest('base64url');
    return {
      name: 'polycord_session',
      value: `${payload}.${signature}`,
      domain: 'localhost',
      path: '/',
    };
  };
  try {
    await sql`insert into users (id, discord_user_id, discord_username, display_name) values (${accountId}, ${discordId}, 'deletion-test', 'Deletion test')`;
    for (const context of contexts) {
      await context.addCookies([cookie(accountId)]);
      expect(
        (
          await context.request.get('http://localhost:3119/api/account/export')
        ).status(),
      ).toBe(200);
    }
    const deleted = await contexts[0].request.delete(
      'http://localhost:3119/api/account',
      { data: { confirmation: 'DELETE' } },
    );
    expect(deleted.status()).toBe(200);
    for (const context of contexts) {
      await context.addCookies([cookie(accountId)]);
      const tab = await context.newPage();
      await tab.goto('http://localhost:3119/en/profile');
      await expect(tab).toHaveURL(/\/en\?next=%2Fen%2Fprofile$/);
      for (const route of ['account/export', 'notifications']) {
        expect(
          (
            await context.request.get(`http://localhost:3119/api/${route}`)
          ).status(),
        ).toBe(401);
      }
      for (const route of [
        'profile',
        'settings',
        'saved',
        'block',
        'report',
        'notifications',
        'profile/bump',
        'profile/boost',
        'profile/voice',
        'push/subscription',
        'billing/portal',
      ]) {
        expect(
          (
            await context.request.post(`http://localhost:3119/api/${route}`, {
              data: {},
            })
          ).status(),
        ).toBe(401);
      }
    }
    expect(
      await sql`select id from users where discord_user_id = ${discordId}`,
    ).toHaveLength(0);
    await sql`insert into users (id, discord_user_id, discord_username, display_name) values (${replacementId}, ${discordId}, 'deletion-test', 'Deletion test')`;
    for (const context of contexts) {
      expect(
        (
          await context.request.get('http://localhost:3119/api/account/export')
        ).status(),
      ).toBe(401);
      expect(
        (
          await context.request.delete('http://localhost:3119/api/account', {
            data: { confirmation: 'DELETE' },
          })
        ).status(),
      ).toBe(401);
    }
    await contexts[0].addCookies([cookie(replacementId)]);
    expect(
      (
        await contexts[0].request.get(
          'http://localhost:3119/api/account/export',
        )
      ).status(),
    ).toBe(200);
    await contexts[0].request.get('http://localhost:3119/api/auth/logout');
    expect(
      (
        await contexts[0].request.get(
          'http://localhost:3119/api/account/export',
        )
      ).status(),
    ).toBe(401);

    await page.context().addCookies([cookie(replacementId)]);
    await page.route('**/api/account', (route) =>
      route.fulfill({
        status: 502,
        json: { error: 'Billing cancellation failed' },
      }),
    );
    for (const locale of ['en', 'ja']) {
      await page.goto(`/${locale}/settings`);
      await page
        .getByRole('button', {
          name: locale === 'en' ? 'Delete account' : 'アカウントを削除',
          exact: true,
        })
        .click();
      await page.getByPlaceholder('DELETE').fill('DELETE');
      await page
        .getByRole('button', {
          name: locale === 'en' ? 'Delete account' : 'アカウントを削除',
          exact: true,
        })
        .click();
      await expect(page.getByRole('main').getByRole('alert')).toContainText(
        locale === 'en' ? 'subscription cancellation failed' : '解約に失敗',
      );
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.screenshot({
        path: testInfo.outputPath(`account-billing-error-${locale}.png`),
        fullPage: true,
      });
    }
    expect(
      await sql`select id from users where id = ${replacementId}`,
    ).toHaveLength(1);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    await sql`delete from users where discord_user_id = ${discordId}`;
    await sql.end();
  }
});
