import { createHmac, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

test('logged-out pages and writes require a session', async ({
  page,
  request,
}) => {
  for (const route of ['profile', 'settings', 'saved']) {
    await page.goto(`/en/${route}`);
    await expect(page).toHaveURL(/\/en$/);
  }
  for (const route of ['profile', 'settings']) {
    const response = await request.post(`/api/${route}`, { data: {} });
    expect(response.status()).toBe(401);
  }
});

test('profile and settings persist through discovery and locale navigation', async ({
  page,
  context,
}) => {
  const id = randomUUID().replaceAll('-', '');
  const name = `Test ${id.slice(0, 8)}`;
  const payload = Buffer.from(
    JSON.stringify({
      user: { id, name, username: name, email: 'original@example.com' },
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
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  try {
    const profile = {
      isPublic: true,
      allowAnonymousCopy: true,
      displayTimezone: true,
      displayAvailability: false,
      primaryLanguage: 'ja',
      targetLanguages: [{ language: 'en', level: 'intermediate' }],
      bio: 'Looking for a patient English conversation partner.',
      tags: ['Cooking'],
      country: 'JP',
      timezone: 'Asia/Tokyo',
    };
    const created = await context.request.post('/api/profile', {
      data: profile,
    });
    expect(created.status()).toBe(200);
    const { profileId } = await created.json();
    await page.goto('/en/profile');
    const bio =
      'Updated through the real profile editor and saved to PostgreSQL.';
    await page.getByLabel('Bio', { exact: true }).fill(bio);
    const saved = page.waitForResponse(
      (r) =>
        r.url().endsWith('/api/profile') && r.request().method() === 'POST',
    );
    await page
      .getByRole('button', { name: 'Save Profile', exact: true })
      .click();
    expect((await saved).status()).toBe(200);
    await page.reload();
    await expect(page.getByLabel('Bio', { exact: true })).toHaveValue(bio);
    const rows =
      await sql`select id, bio from profiles where id = ${profileId}`;
    expect(rows).toHaveLength(1);
    expect(rows[0].bio).toBe(bio);

    await page.goto('/en/settings');
    await page.getByLabel('Email Address').fill('saved@example.com');
    const settingsSaved = page.waitForResponse(
      (r) =>
        r.url().endsWith('/api/settings') && r.request().method() === 'POST',
    );
    await page
      .getByRole('button', { name: 'Save Settings', exact: true })
      .click();
    expect((await settingsSaved).status()).toBe(200);
    const invalid = await context.request.post('/api/settings', {
      data: { email: 'invalid' },
    });
    expect(invalid.status()).toBe(400);
    await page.goto('/en/profile');
    await page.goto('/en/settings');
    await expect(page.getByLabel('Email Address')).toHaveValue(
      'saved@example.com',
    );

    await page.goto('/en');
    const search = page.getByRole('textbox', { name: 'Search profiles' });
    await search.fill(name);
    await expect(
      page.getByRole('heading', { name, exact: true }),
    ).toBeVisible();
    await search.fill(`missing-${id}`);
    await expect(page.getByText(name, { exact: true })).toHaveCount(0);
    await search.fill(name);
    await expect(
      page.getByRole('heading', { name, exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Change language' }).click();
    await page.getByRole('link', { name: 'Japanese', exact: true }).click();
    await expect(page).toHaveURL(/\/ja\?q=/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
    await expect(
      page.getByRole('heading', { name, exact: true }),
    ).toBeVisible();
  } finally {
    await sql`delete from users where discord_user_id = ${id}`;
    await sql.end();
  }
});
