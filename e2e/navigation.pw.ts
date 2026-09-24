import { createHmac, randomUUID } from 'node:crypto';
import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import postgres from 'postgres';

const signIn = async (context: BrowserContext) => {
  const id = randomUUID().replaceAll('-', '');
  const name = `Navigator ${id.slice(0, 8)}`;
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const [account] =
    await sql`insert into users (discord_user_id, discord_username, display_name) values (${id}, ${name}, ${name}) returning id`;
  await sql.end();
  const payload = Buffer.from(
    JSON.stringify({
      user: { id, accountId: account.id, name, username: name },
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
  return { name, accountId: account.id as string };
};

const openAccountMenu = async (page: Page) => {
  const profileItem = page.getByRole('button', {
    name: 'Profile',
    exact: true,
  });
  await expect(async () => {
    await page.getByRole('button', { name: 'Account menu' }).click();
    await expect(profileItem).toBeVisible({ timeout: 2000 });
  }).toPass();
};

const expectShell = async (page: Page) => {
  await expect(
    page.getByRole('button', { name: 'Polycord', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeAttached();
  await expect(page.getByRole('main')).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
};

test('guarded routes keep the destination through sign-in', async ({
  page,
}) => {
  await page.goto('/en/settings');
  await expect(page).toHaveURL('/en?next=%2Fen%2Fsettings');
  await expectShell(page);
  await page.route('**/api/auth/discord?*', (route) =>
    route.fulfill({ status: 200, body: 'signing in' }),
  );
  await page
    .getByRole('button', { name: 'Login with Discord', exact: true })
    .click();
  await expect(page).toHaveURL(
    '/api/auth/discord?locale=en&next=%2Fen%2Fsettings',
  );
});

test('a failed sign-in shows the error and keeps the destination', async ({
  page,
}) => {
  await page.route('https://discord.com/**', (route) =>
    route.fulfill({ status: 200, body: 'discord' }),
  );
  await page.goto('/api/auth/discord?locale=en&next=%2Fen%2Fsettings');
  await page.goto('/api/auth/discord/callback?error=access_denied');
  await expect(page).toHaveURL(
    '/en?authError=oauth_cancelled&next=%2Fen%2Fsettings',
  );
  await expect(page.getByText('Discord login did not finish')).toBeVisible();
  await page.route('**/api/auth/discord?*', (route) =>
    route.fulfill({ status: 200, body: 'signing in' }),
  );
  await page
    .getByRole('button', { name: 'Login with Discord', exact: true })
    .click();
  await expect(page).toHaveURL(
    '/api/auth/discord?locale=en&next=%2Fen%2Fsettings',
  );

  await page.goto('/en?q=travel&authError=oauth_cancelled');
  await page
    .getByRole('button', { name: 'Login with Discord', exact: true })
    .click();
  await expect(page).toHaveURL(
    '/api/auth/discord?locale=en&next=%2Fen%3Fq%3Dtravel',
  );
});

test('every product route shares navigation and returns to discovery', async ({
  page,
  context,
}, testInfo) => {
  const { name, accountId } = await signIn(context);
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  try {
    await page.goto('/en/onboarding');
    await expectShell(page);
    const created = await context.request.post('/api/profile', {
      data: {
        isPublic: true,
        allowAnonymousCopy: true,
        displayTimezone: true,
        displayAvailability: false,
        availability: null,
        primaryLanguage: 'en',
        targetLanguages: [{ language: 'ja', level: 'beginner' }],
        bio: 'A navigation fixture that checks every route has a way home.',
        tags: ['Travel'],
        country: 'US',
        timezone: 'America/Chicago',
      },
    });
    expect(created.status()).toBe(200);
    const [{ id: profileId }] =
      await sql`select id from profiles where user_id = ${accountId}`;
    const routes = [
      'profile',
      'settings',
      'saved',
      `u/${profileId}`,
      'legal',
      'legal/privacy',
    ];
    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['', ...routes]) {
        await page.goto(`/en/${route}`);
        await expect(page.locator('.skeleton-shimmer')).toHaveCount(0);
        await expectShell(page);
        await page.screenshot({
          path: testInfo.outputPath(
            `${route.replaceAll('/', '-') || 'discovery'}-${width}.png`,
          ),
          fullPage: true,
        });
      }
    }

    await page.setViewportSize({ width: 1280, height: 900 });
    const search = `/en?q=${encodeURIComponent(name)}`;
    await page.goto(search);
    await expect(page.getByText('1 partner', { exact: true })).toBeVisible();
    await openAccountMenu(page);
    await expect(
      page.getByRole('button', { name: 'Bump profile', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page).toHaveURL('/en/settings');
    await openAccountMenu(page);
    await expect(page.getByText('Bump profile')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page
      .getByRole('button', { name: 'Back to discovery', exact: true })
      .click();
    await expect(page).toHaveURL(search);
    await expect(page.getByText('1 partner', { exact: true })).toBeVisible();

    const fresh = await context.newPage();
    await fresh.goto('/en/profile');
    await fresh
      .getByRole('button', { name: 'Back to discovery', exact: true })
      .click();
    await expect(fresh).toHaveURL('/en');
    await fresh.goto('/ja/settings');
    await fresh
      .getByRole('button', { name: 'ディスカバリーに戻る', exact: true })
      .click();
    await expect(fresh).toHaveURL('/ja');
  } finally {
    await sql`delete from users where id = ${accountId}`;
    await sql.end();
  }
});
