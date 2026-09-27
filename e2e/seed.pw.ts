import { createHmac } from 'node:crypto';
import { type BrowserContext, expect, test } from '@playwright/test';
import postgres from 'postgres';

type Account = { id: string; discordUserId: string };

const signIn = (context: BrowserContext, user: Account) => {
  const payload = Buffer.from(
    JSON.stringify({
      user: {
        id: user.discordUserId,
        accountId: user.id,
        name: user.discordUserId,
        username: user.discordUserId,
      },
      issuedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', 'polycord-isolated-audit-secret')
    .update(payload)
    .digest('base64url');
  return context.addCookies([
    {
      name: 'polycord_session',
      value: `${payload}.${signature}`,
      domain: 'localhost',
      path: '/',
    },
  ]);
};

test('admins seed, browse and remove dummy profiles on an approved database', async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(180000);
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const realAccounts = () =>
    sql`select count(*)::int as total from users where not is_synthetic`.then(
      ([row]) => row.total,
    );
  await sql`delete from users where discord_user_id = 'e2e-admin'`;
  const [owner] = await sql<Account[]>`
    insert into users (discord_user_id, discord_username, display_name)
    values ('e2e-admin', 'e2e-admin', 'E2E Owner')
    returning id, discord_user_id as "discordUserId"`;
  const real = await realAccounts();
  try {
    await signIn(context, owner);
    await page.goto('/en/admin');
    await expect(page.getByRole('tab', { name: 'Reports' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Dummy data' })).toHaveCount(0);

    await sql`insert into seed_database (label) values ('Local Test Database')`;
    await page.reload();
    await page.getByRole('tab', { name: 'Dummy data' }).click();
    const panel = page.getByRole('region', { name: 'Dummy data' });
    const dummies = panel.getByText('Dummy profiles').locator('..');
    await expect(
      panel.getByText('Affected database: Local Test Database'),
    ).toBeVisible();
    await expect(panel.getByText('Real accounts').locator('..')).toContainText(
      String(real),
    );
    await panel.getByRole('button', { name: '5,000' }).click();
    await panel.getByRole('button', { name: 'Apply' }).click();
    await expect(panel.getByRole('status')).toContainText('of 5,000');
    await page.screenshot({ path: testInfo.outputPath('seed-progress.png') });
    await expect(dummies).toContainText('5,000', { timeout: 60000 });
    await page.screenshot({ path: testInfo.outputPath('seed-done.png') });
    expect(await realAccounts()).toBe(real);

    await page.goto('/en');
    await expect(
      page
        .getByText('Dummy', { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('seed-discovery.png') });

    await page.goto('/en/admin');
    await page.getByRole('tab', { name: 'Dummy data' }).click();
    await panel.getByRole('button', { name: 'Remove all' }).click();
    await expect(dummies).toContainText(/^Dummy profiles0$/, {
      timeout: 60000,
    });
    expect(await realAccounts()).toBe(real);
  } finally {
    await sql`delete from users where is_synthetic`;
    await sql`delete from seed_database`;
    await sql`delete from users where id = ${owner.id}`;
    await sql.end();
  }
});
