import { createHmac, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

test('a new public profile is offered a bump once after onboarding', async ({
  page,
  context,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const id = randomUUID().replaceAll('-', '');
  const name = `Bump hint ${id.slice(0, 8)}`;
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
  const hint = page.getByText('Bump your profile to show it in Discovery');
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
          bio: 'A new profile that learns to bump right after onboarding.',
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
    await expect(hint).toBeVisible();
    await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(
      0,
    );

    await page.getByRole('button', { name: 'Bump now', exact: true }).click();
    await expect(page.getByText('Profile bumped')).toBeVisible();
    await expect(hint).toHaveCount(0);
    await expect(
      page
        .locator('article')
        .first()
        .getByRole('heading', { name, exact: true }),
    ).toBeVisible();

    await page.reload();
    await expect(
      page
        .locator('article')
        .first()
        .getByRole('heading', { name, exact: true }),
    ).toBeVisible();
    await expect(hint).toHaveCount(0);
  } finally {
    await sql`delete from users where id=${owner.id}`;
    await sql.end();
  }
});
