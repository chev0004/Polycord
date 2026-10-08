import { createHmac, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

test('account search returns bounded pages and loads more on request', async ({
  browser,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const [owner] = await sql`
    insert into users (discord_user_id, discord_username, display_name)
    values ('e2e-admin', 'e2e-admin', 'E2E Owner')
    on conflict (discord_user_id) do update set display_name = excluded.display_name
    returning id, discord_user_id as "discordUserId"`;
  const bulk = await sql`
    insert into users (discord_user_id, discord_username, display_name)
    select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Bulk ' || lpad(n::text, 2, '0')
    from generate_series(1, 45) n returning id`;
  const context = await browser.newContext({
    baseURL: 'http://localhost:3119',
  });
  try {
    const payload = Buffer.from(
      JSON.stringify({
        user: {
          id: owner.discordUserId,
          accountId: owner.id,
          name: owner.discordUserId,
          username: owner.discordUserId,
        },
        issuedAt: Date.now(),
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
    const page = await context.newPage();
    const requests: string[] = [];
    const sizes: number[] = [];
    page.on('response', async (response) => {
      if (!response.url().includes('/api/admin/users')) return;
      requests.push(new URL(response.url()).search);
      sizes.push((await response.json()).results.length);
    });
    await page.goto('/en/admin');
    await page.getByRole('button', { name: 'Manage staff' }).click();
    await page.getByRole('button', { name: 'Add moderator' }).click();
    const picker = page.getByRole('combobox', { name: 'Add moderator' });
    await picker.fill(`${prefix} Bulk`);
    const options = page.getByRole('option');
    await expect(options).toHaveCount(20);
    expect(sizes).toEqual([20]);
    const box = await page.getByRole('listbox').locator('..').boundingBox();
    expect(box?.height).toBeLessThanOrEqual(260);

    await page.getByRole('button', { name: 'Show more accounts' }).click();
    await expect(options).toHaveCount(40);
    expect(requests.at(-1)).toContain('offset=20');
    await page.getByRole('button', { name: 'Show more accounts' }).click();
    await expect(options).toHaveCount(45);
    await expect(
      page.getByRole('button', { name: 'Show more accounts' }),
    ).toHaveCount(0);
    expect(sizes).toEqual([20, 20, 5]);

    await picker.fill(`${prefix} Bulk 04`);
    await expect(options).toHaveCount(1);
    await expect(
      page.getByRole('option', { name: new RegExp(`${prefix} Bulk 04`) }),
    ).toBeVisible();

    await picker.fill('');
    await page.getByRole('button', { name: 'IP blocks' }).click();
    const ipPicker = page.getByRole('combobox', {
      name: 'Pick an account to see its IP addresses',
    });
    await ipPicker.fill(`${prefix} Bulk`);
    await expect(options).toHaveCount(20);
    await expect(
      page.getByRole('button', { name: 'Show more accounts' }),
    ).toBeVisible();
  } finally {
    await context.close();
    await sql`delete from users where id in ${sql(bulk.map(({ id }) => id))}`;
    await sql.end();
  }
});
