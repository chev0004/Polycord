import { createHmac, randomUUID } from 'node:crypto';
import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import postgres from 'postgres';

const newBuild = async (page: Page) => {
  await page.route('**/api/build', (route) =>
    route.fulfill({ json: { buildId: 'a-newer-build' } }),
  );
};

const countLoads = (page: Page) => {
  const loads = { count: 0 };
  page.on('load', () => {
    loads.count += 1;
  });
  return loads;
};

const checkAgain = (page: Page) =>
  page.evaluate(() => window.dispatchEvent(new Event('focus')));

const failChunk = (page: Page) =>
  page.evaluate(() =>
    window.dispatchEvent(
      new ErrorEvent('error', {
        error: Object.assign(new Error('Loading chunk 9 failed.'), {
          name: 'ChunkLoadError',
        }),
      }),
    ),
  );

const signIn = async (context: BrowserContext) => {
  const id = randomUUID().replaceAll('-', '');
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const [account] =
    await sql`insert into users (discord_user_id, discord_username, display_name, email) values (${id}, ${id}, ${id}, 'deploy@example.com') returning id`;
  await sql.end();
  const payload = Buffer.from(
    JSON.stringify({
      user: {
        id,
        accountId: account.id,
        name: id,
        username: id,
        email: 'deploy@example.com',
      },
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
};

test('the server reports the build it is running', async ({ request }) => {
  const response = await request.get('/api/build');
  expect(response.headers()['cache-control']).toBe('no-store');
  expect((await response.json()).buildId).toBeTruthy();
});

test('an open page reloads once onto a newer build', async ({ page }) => {
  await newBuild(page);
  const loads = countLoads(page);
  await page.goto('/en/legal');
  await expect.poll(() => loads.count).toBe(2);
  await checkAgain(page);
  await page.goto('/en/legal/privacy');
  await checkAgain(page);
  await page.waitForTimeout(1500);
  expect(loads.count).toBe(3);
});

test('a page on the current build is left alone', async ({ page }) => {
  const loads = countLoads(page);
  await page.goto('/en/legal');
  await checkAgain(page);
  await page.waitForTimeout(1500);
  expect(loads.count).toBe(1);
});

test('a failed lazy chunk recovers with a single reload', async ({ page }) => {
  const loads = countLoads(page);
  await page.goto('/en/legal');
  await failChunk(page);
  await expect.poll(() => loads.count).toBe(2);
  await failChunk(page);
  await page.waitForTimeout(1500);
  expect(loads.count).toBe(2);
});

test('unsaved edits are never reloaded silently', async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(context);
  await page.goto('/en/settings');
  const email = page.getByLabel('Email Address');
  await email.fill('changed@example.com');
  await newBuild(page);
  const loads = countLoads(page);
  await checkAgain(page);
  await expect(page.getByText('A new version is available')).toBeVisible();
  await page.waitForTimeout(1000);
  expect(loads.count).toBe(0);
  await expect(email).toHaveValue('changed@example.com');
  await page.getByRole('button', { name: 'Discard' }).click();
  await expect.poll(() => loads.count).toBe(1);
});

test('a failed chunk never reloads unsaved edits silently', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(context);
  await page.goto('/en/settings');
  const email = page.getByLabel('Email Address');
  await email.fill('changed@example.com');
  const loads = countLoads(page);
  await failChunk(page);
  await expect(page.getByText('A new version is available')).toBeVisible();
  await page.waitForTimeout(1000);
  expect(loads.count).toBe(0);
  await expect(email).toHaveValue('changed@example.com');
  await page.getByRole('button', { name: 'Discard' }).click();
  await expect.poll(() => loads.count).toBe(1);
});
