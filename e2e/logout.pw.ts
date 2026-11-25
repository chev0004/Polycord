import { createHmac, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

test('logging out lands on the locale home with no query', async ({
  page,
  context,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const id = randomUUID().replaceAll('-', '');
  const name = `Logout ${id.slice(0, 8)}`;
  const [owner] =
    await sql`insert into users (discord_user_id,discord_username,display_name) values (${id},${name},${name}) returning id`;
  const payload = Buffer.from(
    JSON.stringify({
      user: { id, accountId: owner.id, name, username: name },
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
  try {
    await page.goto('/ja/legal');
    await page.getByRole('button', { name: 'アカウントメニュー' }).click();
    await page.getByRole('button', { name: 'ログアウト', exact: true }).click();
    await expect(page).toHaveURL('http://localhost:3119/ja');
    await expect(
      page.getByRole('button', { name: 'Discordでログイン' }),
    ).toBeVisible();
    expect(
      (await context.cookies()).some(
        (cookie) => cookie.name === 'polycord_session',
      ),
    ).toBe(false);
  } finally {
    await sql`delete from users where id=${owner.id}`;
    await sql.end();
  }
});
