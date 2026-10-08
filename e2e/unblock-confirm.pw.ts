import { createHmac, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

for (const layout of ['desktop', 'mobile'] as const) {
  test(`unblocking asks for confirmation first on ${layout}`, async ({
    page,
    context,
  }) => {
    const sql = postgres(process.env.TEST_DATABASE_URL as string);
    const prefix = `Unblock${randomUUID().slice(0, 6)}`;
    const people = ['Viewer', 'Target'].map((role) => ({
      id: `${prefix}-${role.toLowerCase()}`,
      name: `${prefix} ${role}`,
    }));
    const accounts: string[] = [];
    try {
      for (const user of people) {
        const [account] =
          await sql`insert into users (discord_user_id, discord_username, display_name) values (${user.id}, ${user.id}, ${user.name}) returning id`;
        accounts.push(account.id);
      }
      await sql`insert into user_blocks (blocker_user_id, blocked_user_id) values (${accounts[0]}, ${accounts[1]})`;
      const payload = Buffer.from(
        JSON.stringify({
          user: { ...people[0], accountId: accounts[0] },
          expiresAt: Date.now() + 3600000,
        }),
      ).toString('base64url');
      await context.addCookies([
        {
          name: 'polycord_session',
          value: `${payload}.${createHmac('sha256', 'polycord-isolated-audit-secret').update(payload).digest('base64url')}`,
          domain: 'localhost',
          path: '/',
        },
      ]);
      if (layout === 'mobile')
        await page.setViewportSize({ width: 390, height: 844 });
      const unblocks: string[] = [];
      page.on('request', (request) => {
        if (
          new URL(request.url()).pathname === '/api/block' &&
          request.method() === 'DELETE'
        )
          unblocks.push(request.url());
      });
      await page.goto('/en/settings');
      await page
        .getByRole('button', { name: /^Privacy/ })
        .first()
        .click();
      await page.getByRole('button', { name: /^Blocked accounts/ }).click();
      const trigger = page.getByRole('button', {
        name: `Unblock ${people[1].name}`,
        exact: true,
      });
      const dialog = page.getByRole('dialog');

      for (const dismiss of [
        () => dialog.getByRole('button', { name: 'Cancel' }).click(),
        () => page.keyboard.press('Escape'),
        () => page.mouse.click(5, 5),
      ]) {
        await trigger.click();
        await expect(
          dialog.getByRole('heading', { name: `Unblock ${people[1].name}?` }),
        ).toBeVisible();
        await expect(dialog).toContainText('Discovery');
        await dismiss();
        await expect(dialog).toBeHidden();
        await expect(trigger).toBeVisible();
      }
      expect(unblocks).toEqual([]);
      expect(
        await sql`select 1 from user_blocks where blocker_user_id = ${accounts[0]}`,
      ).toHaveLength(1);

      await trigger.click();
      await dialog
        .getByRole('button', { name: 'Unblock', exact: true })
        .click();
      await expect(
        page.getByText('You have no blocked accounts.'),
      ).toBeVisible();
      expect(unblocks).toHaveLength(1);
      expect(
        await sql`select 1 from user_blocks where blocker_user_id = ${accounts[0]}`,
      ).toHaveLength(0);
    } finally {
      await sql`delete from users where id in ${sql(accounts)}`;
      await sql.end();
    }
  });
}
