import { createHmac, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

test('the navbar logo opens Discovery with the profile bumped after onboarding', async ({
  page,
  context,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const id = randomUUID().replaceAll('-', '');
  const name = `Logo return ${id.slice(0, 8)}`;
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
  const ownCard = page
    .locator('article')
    .first()
    .getByRole('heading', { name, exact: true });
  try {
    await page.goto('/en/onboarding');
    await page.evaluate(
      ([key, draft]) => sessionStorage.setItem(key, draft),
      [
        `polycord:profile:${id}`,
        JSON.stringify({
          isPublic: true,
          allowAnonymousCopy: true,
          displayTimezone: true,
          displayAvailability: false,
          primaryLanguage: 'en',
          targetLanguages: [{ language: 'ja', level: 'beginner' }],
          bio: 'A profile that returns to Discovery through the navbar logo.',
          tags: [],
          country: 'US',
          timezone: 'UTC',
        }),
      ],
    );
    await page.reload();
    await page
      .getByRole('button', { name: 'Publish profile', exact: true })
      .click();
    await expect(page).toHaveURL('/en');
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page
      .getByRole('button', { name: 'Bump profile', exact: true })
      .click();
    await expect(ownCard).toBeVisible();

    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('button', { name: 'Profile', exact: true }).click();
    await expect(page).toHaveURL('/en/profile');
    await page.getByRole('button', { name: 'Polycord', exact: true }).click();
    await expect(page).toHaveURL('/en');
    await expect(ownCard).toBeVisible();
  } finally {
    await sql`delete from users where id=${owner.id}`;
    await sql.end();
  }
});
