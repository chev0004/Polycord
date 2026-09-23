import { createHmac, randomUUID } from 'node:crypto';
import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import postgres from 'postgres';

const settings = {
  isPublic: true,
  allowAnonymousCopy: true,
  displayTimezone: true,
  pushNotifications: false,
  profileInteractionAlert: true,
  profileViewAlert: false,
  hideProfileVisits: false,
  productAnalytics: false,
  theme: 'dark',
  applicationLanguage: 'en',
  timeFormat: '24hr',
  languageDisplay: 'long',
  email: 'preferences@example.com',
};

const signIn = async (context: BrowserContext) => {
  const id = randomUUID().replaceAll('-', '');
  const name = `Preferences ${id.slice(0, 8)}`;
  const payload = Buffer.from(
    JSON.stringify({
      user: { id, name, username: name, email: settings.email },
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
  const created = await context.request.post('/api/profile', {
    data: {
      isPublic: true,
      allowAnonymousCopy: true,
      displayTimezone: true,
      displayAvailability: true,
      availability: {
        days: 'weekdays',
        from: '18:00',
        to: '22:00',
        anyTime: false,
      },
      primaryLanguage: 'ja',
      targetLanguages: [{ language: 'en', level: 'intermediate' }],
      bio: 'Looking for a patient conversation partner to practice languages.',
      tags: ['Cooking'],
      country: 'JP',
      timezone: 'Asia/Tokyo',
    },
  });
  expect(created.status()).toBe(200);
  return { id, name, profileId: (await created.json()).profileId };
};

const choose = async (page: Page, label: string, option: string) => {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
};

test('save and discard preferences, then restore them in a fresh browser', async ({
  page,
  context,
  browser,
}, testInfo) => {
  const account = await signIn(context);
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const fresh = await browser.newContext({
    baseURL: 'http://localhost:3119',
    viewport: { width: 390, height: 844 },
  });
  try {
    await page.goto('/en/settings?from=saved&page=2#appearance');
    await expect(
      page.getByRole('combobox', { name: 'Theme', exact: true }),
    ).toBeVisible();
    await choose(page, 'Theme', 'Light Mode');
    await choose(page, 'Application Language', 'Japanese (JA)');
    await choose(page, 'Time Format', '12-hour');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Discard', exact: true }).click();
    await expect(
      page.getByRole('combobox', { name: 'Theme', exact: true }),
    ).toHaveText('Dark Mode');
    await expect(
      page.getByRole('combobox', { name: 'Application Language' }),
    ).toHaveText('English (EN)');
    await choose(page, 'Theme', 'Light Mode');
    await choose(page, 'Application Language', 'Japanese (JA)');
    await choose(page, 'Time Format', '12-hour');
    await choose(page, 'Language Names', 'Short codes');
    await page
      .getByRole('button', { name: 'Save Settings', exact: true })
      .click();
    await expect(page).toHaveURL('/ja/settings?from=saved&page=2#appearance');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(
      page.getByRole('button', { name: '設定を保存', exact: true }),
    ).toBeDisabled();
    await page.screenshot({
      path: testInfo.outputPath('settings-light-ja.png'),
      fullPage: true,
    });
    const [stored] =
      await sql`select s.* from user_settings s join users u on u.id=s.user_id where u.discord_user_id=${account.id}`;
    expect(stored).toMatchObject({
      theme: 'light',
      application_language: 'ja',
      time_format: '12hr',
      language_display: 'short',
    });
    await fresh.addCookies(
      (await context.cookies()).filter(
        (cookie) => cookie.name === 'polycord_session',
      ),
    );
    await fresh.addInitScript(() =>
      localStorage.setItem('polycord_timeFormat', '24hr'),
    );
    const phone = await fresh.newPage();
    await phone.goto(`/ja/u/${account.profileId}`);
    await expect(phone.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(phone.locator('article')).toContainText(/午後6:00/);
    await expect(phone.locator('article')).toContainText('JA');
    await phone.screenshot({
      path: testInfo.outputPath('profile-light-ja-mobile.png'),
      fullPage: true,
    });
    await page.goto(`/ja?q=${encodeURIComponent(account.name)}&page=2#results`);
    await page.getByRole('button', { name: '言語を変更' }).click();
    await page
      .locator('.PopoverContent')
      .getByRole('link', { name: 'English', exact: true })
      .click();
    await expect(page).toHaveURL(/\/en\?q=.*#results$/);
    const [changed] =
      await sql`select application_language from user_settings s join users u on u.id=s.user_id where u.discord_user_id=${account.id}`;
    expect(changed.application_language).toBe('en');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.goto('/en/settings#appearance');
    await expect(
      page.getByRole('combobox', { name: 'Application Language' }),
    ).toHaveText('English (EN)');
    await choose(page, 'Theme', 'Dark Mode');
    await page
      .getByRole('button', { name: 'Save Settings', exact: true })
      .click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(
      page.getByRole('combobox', { name: 'Theme', exact: true }),
    ).toHaveCSS('background-color', 'rgb(17, 17, 17)');
    await page.screenshot({
      path: testInfo.outputPath('settings-dark-en.png'),
      fullPage: true,
    });
  } finally {
    await fresh.close();
    await sql`delete from users where discord_user_id=${account.id}`;
    await sql.end();
  }
});

test('light appearance reaches core pages and exposes only supported settings', async ({
  page,
  context,
}, testInfo) => {
  const account = await signIn(context);
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  try {
    expect(
      (
        await context.request.post('/api/settings', {
          data: { ...settings, theme: 'light' },
        })
      ).status(),
    ).toBe(200);
    for (const locale of ['de', 'en-US', '']) {
      expect(
        (
          await context.request.post('/api/settings', {
            data: { ...settings, applicationLanguage: locale },
          })
        ).status(),
      ).toBe(400);
      expect(
        (
          await context.request.patch('/api/settings', {
            data: { applicationLanguage: locale },
          })
        ).status(),
      ).toBe(400);
    }
    for (const route of [
      'settings',
      'profile',
      'onboarding',
      'saved',
      'analytics',
      'legal',
      `u/${account.profileId}`,
      '',
    ]) {
      await page.goto(`/en/${route}`);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      await expect(page.locator('body')).toHaveCSS('color', 'rgb(24, 35, 47)');
      await expect(page.locator('body')).toHaveCSS(
        'background-color',
        'rgb(244, 246, 249)',
      );
      await expect(page.getByText('Application error')).toHaveCount(0);
      if (['profile', ''].includes(route))
        await page.screenshot({
          path: testInfo.outputPath(`${route || 'discovery'}-light-en.png`),
          fullPage: true,
        });
    }
    await page.goto('/en/settings');
    await expect(page.getByText(/Sign-in uses Discord/)).toBeVisible();
    await expect(
      page.getByPlaceholder('Enter your email for recovery'),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Privacy', exact: true }).click();
    await expect(
      page.getByRole('switch', { name: 'Activity Status' }),
    ).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Notifications', exact: true })
      .click();
    await expect(
      page.getByRole('switch', { name: 'New Match Alert' }),
    ).toHaveCount(0);
    await expect(page.getByText(/Changes apply immediately/)).toBeVisible();
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();
    await page.getByRole('combobox', { name: 'Application Language' }).click();
    await expect(page.getByRole('option')).toHaveCount(2);
    await page.screenshot({
      path: testInfo.outputPath('locale-menu-light-en.png'),
      fullPage: true,
    });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Account', exact: true }).click();
    await page
      .getByLabel('Email Address')
      .fill('saved.preferences@example.com');
    await page
      .getByRole('button', { name: 'Save Settings', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Save Settings', exact: true }),
    ).toBeDisabled();
    await page.reload();
    await expect(page.getByLabel('Email Address')).toHaveValue(
      'saved.preferences@example.com',
    );
  } finally {
    await sql`delete from users where discord_user_id=${account.id}`;
    await sql.end();
  }
});

test('failed language saves retain the route and allow retry', async ({
  page,
  context,
}) => {
  const account = await signIn(context);
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  try {
    await page.goto('/en?q=unchanged');
    await page.route('**/api/settings', (route) =>
      route.fulfill({ status: 503, body: '{}' }),
    );
    await page.getByRole('button', { name: 'Change language' }).click();
    await page.getByRole('link', { name: 'Japanese', exact: true }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Could not save language.' }),
    ).toHaveText('Could not save language. Try again.');
    await expect(page).toHaveURL('/en?q=unchanged');
    await page.unroute('**/api/settings');
    await page.getByRole('link', { name: 'Japanese', exact: true }).click();
    await expect(page).toHaveURL('/ja?q=unchanged');
    await page
      .getByRole('navigation', { name: '言語', exact: true })
      .getByRole('link', { name: 'English', exact: true })
      .click();
    await expect(page).toHaveURL('/en?q=unchanged');
    const [stored] =
      await sql`select application_language from user_settings s join users u on u.id=s.user_id where u.discord_user_id=${account.id}`;
    expect(stored.application_language).toBe('en');
    await context.clearCookies();
    await page.reload();
    await page
      .getByRole('navigation', { name: 'Language', exact: true })
      .getByRole('link', { name: '日本語', exact: true })
      .click();
    await expect(page).toHaveURL('/ja?q=unchanged');
    expect(
      (await context.cookies()).find((cookie) => cookie.name === 'NEXT_LOCALE')
        ?.value,
    ).toBe('ja');
  } finally {
    await sql`delete from users where discord_user_id=${account.id}`;
    await sql.end();
  }
});
