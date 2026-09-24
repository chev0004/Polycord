import { createHmac, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

test('missing routes and malformed profile identifiers recover in both locales', async ({
  page,
  request,
}) => {
  for (const locale of ['en', 'ja']) {
    for (const route of ['missing-page', 'u/not-a-uuid', `u/${randomUUID()}`]) {
      const response = await page.goto(`/${locale}/${route}`);
      expect(response?.status()).toBe(404);
      await expect(
        page.getByRole('heading', {
          name: locale === 'en' ? 'Page not found' : 'ページが見つかりません',
        }),
      ).toBeVisible();
      await expect(page.getByRole('link')).toHaveAttribute(
        'href',
        `/${locale}`,
      );
    }
  }
  expect((await page.goto('/fr/profile'))?.status()).toBe(404);
  await expect(page.getByRole('link')).toHaveAttribute('href', '/en');
  expect((await request.get('/api/voice/not-a-uuid')).status()).toBe(404);
});

test('malformed mutation identifiers are rejected before database queries', async ({
  context,
  page,
}) => {
  const id = randomUUID().replaceAll('-', '');
  const accountId = randomUUID();
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const payload = Buffer.from(
    JSON.stringify({
      user: { id, accountId, name: 'Recovery fixture' },
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
    await sql`insert into users (id, discord_user_id, discord_username, display_name) values (${accountId}, ${id}, 'recovery', 'Recovery fixture')`;
    for (const route of ['saved', 'block', 'report', 'notifications']) {
      const response = await context.request.post(`/api/${route}`, {
        data: { profileId: 'not-a-uuid', reason: 'spam' },
      });
      expect(response.status()).toBe(400);
    }
    for (const method of ['patch', 'delete'] as const) {
      expect(
        (
          await context.request[method]('/api/notifications', {
            data: { id: 'not-a-uuid', read: true },
          })
        ).status(),
      ).toBe(400);
    }
    await page.addInitScript(() =>
      localStorage.setItem(
        'polycord_onboarding_draft',
        JSON.stringify({
          primaryLanguage: 'ja',
          targetLanguage: 'en',
          proficiencyLevel: 'intermediate',
          timezone: 'Asia/Tokyo',
          availability: 'flexible',
          bio: 'A recoverable onboarding draft.',
          tags: [],
        }),
      ),
    );
    await page.goto('/en/onboarding');
    await page
      .getByRole('combobox', { name: 'Current level', exact: true })
      .click();
    await page
      .getByRole('option', { name: 'Intermediate', exact: true })
      .click();
    await page.route('**/api/onboarding', (route) => route.abort());
    await page.getByRole('button', { name: 'Publish Profile' }).click();
    await expect(
      page.getByText('Profile publishing failed. Please try again.'),
    ).toBeVisible();
    await expect(page.getByLabel('Bio', { exact: true })).toHaveValue(
      'A recoverable onboarding draft.',
    );
    await page.unroute('**/api/onboarding');
    await page.route('**/api/onboarding', (route) =>
      route.fulfill({ status: 401, json: { error: 'Unauthorized' } }),
    );
    await page.getByRole('button', { name: 'Publish Profile' }).click();
    await expect(
      page.getByRole('link', { name: 'Sign in again' }),
    ).toBeVisible();
  } finally {
    await sql`delete from users where discord_user_id = ${id}`;
    await sql.end();
  }
});

test('layout database failures expose recovery without internal details', async ({
  page,
  context,
}) => {
  const id = randomUUID().replaceAll('-', '');
  const accountId = randomUUID();
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const payload = Buffer.from(
    JSON.stringify({
      user: { id, accountId, name: 'Failure fixture' },
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
    await sql`insert into users (id, discord_user_id, discord_username, display_name) values (${accountId}, ${id}, 'failure', 'Failure fixture')`;
    await sql`alter table user_settings rename to user_settings_recovery_test`;
    try {
      await page.goto('/ja/legal');
      await expect(
        page.getByRole('heading', { name: '問題が発生しました' }),
      ).toBeVisible();
      await expect(page.locator('body')).not.toContainText('user_settings');
    } finally {
      await sql`alter table user_settings_recovery_test rename to user_settings`;
    }
    await page.getByRole('button', { name: '再試行' }).click();
    await expect(
      page.getByRole('heading', { name: '問題が発生しました' }),
    ).toHaveCount(0);
  } finally {
    await sql`delete from users where discord_user_id = ${id}`;
    await sql.end();
  }
});
