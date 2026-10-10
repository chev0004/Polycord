import { createHmac, randomUUID } from 'node:crypto';
import { type BrowserContext, expect, test } from '@playwright/test';
import postgres from 'postgres';

const sql = postgres(process.env.TEST_DATABASE_URL as string);
const skeletonBuild =
  process.env.NEXT_PUBLIC_DISCOVERY_SKELETON_ENABLED !== 'false';

const settings = {
  isPublic: true,
  allowAnonymousCopy: true,
  displayTimezone: true,
  pushNotifications: false,
  profileInteractionAlert: true,
  profileViewAlert: false,
  hideProfileVisits: false,
  productAnalytics: false,
  applicationLanguage: 'en',
  timeFormat: '24hr',
  languageDisplay: 'long',
  email: 'dev@example.com',
};

const signIn = async (context: BrowserContext, discordId: string) => {
  const [account] =
    await sql`insert into users (discord_user_id, discord_username, display_name, email) values (${discordId}, ${discordId}, ${discordId}, ${settings.email}) on conflict (discord_user_id) do update set email = excluded.email returning id`;
  const payload = Buffer.from(
    JSON.stringify({
      user: {
        id: discordId,
        accountId: account.id,
        name: discordId,
        username: discordId,
        email: settings.email,
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
  return account.id as string;
};

const stored = async (accountId: string) => {
  const [row] =
    await sql`select load_tracing, discovery_skeleton from user_settings where user_id = ${accountId}`;
  return row ? [row.load_tracing, row.discovery_skeleton] : null;
};

test.afterAll(async () => {
  await sql.end();
});

test('an owner turns load tracing on and off without a redeploy', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const accountId = await signIn(context, 'e2e-admin');
  await sql`delete from user_settings where user_id = ${accountId}`;
  await page.goto('/en/settings#dev');
  await expect(page.getByRole('heading', { name: 'Dev' })).toBeVisible();
  const tracing = page.getByRole('switch', { name: 'Load tracing' });
  await expect(tracing).not.toBeChecked();
  expect(
    (await context.request.get('/en/settings')).headers()['server-timing'],
  ).toBeUndefined();
  await tracing.click();
  await page.getByRole('button', { name: 'Save Settings' }).click();
  await expect(page.getByText('Reload to apply')).toBeVisible();
  await expect.poll(() => stored(accountId)).toEqual([true, false]);
  const traced = await context.request.get('/en/settings');
  expect(traced.headers()['server-timing']).toContain('pc_');
  await page.getByRole('button', { name: 'Reload' }).click();
  await expect(
    page.getByRole('switch', { name: 'Load tracing' }),
  ).toBeChecked();
  await expect(page.getByText('Reload to apply')).toHaveCount(0);
  await page.getByRole('switch', { name: 'Load tracing' }).click();
  await page.getByRole('button', { name: 'Save Settings' }).click();
  await expect.poll(() => stored(accountId)).toEqual([false, false]);
  expect(
    (await context.request.get('/en/settings')).headers()['server-timing'],
  ).toBeUndefined();
});

test('an owner switches Discovery to the skeleton shell for themselves only', async ({
  page,
  context,
  browser,
}) => {
  test.skip(skeletonBuild, 'the build already serves the skeleton shell');
  await page.setViewportSize({ width: 1280, height: 900 });
  const accountId = await signIn(context, 'e2e-admin');
  await sql`delete from user_settings where user_id = ${accountId}`;
  const html = async () => (await context.request.get('/en')).text();
  expect(await html()).not.toContain('skeleton-shimmer');
  await page.goto('/en/settings#dev');
  await page
    .getByRole('switch', { name: 'Discovery skeleton loading' })
    .click();
  await page.getByRole('button', { name: 'Save Settings' }).click();
  await expect.poll(() => stored(accountId)).toEqual([false, true]);
  expect(await html()).toContain('skeleton-shimmer');
  const other = await browser.newContext();
  expect(await (await other.request.get('/en')).text()).not.toContain(
    'skeleton-shimmer',
  );
  await other.close();
  await page
    .getByRole('switch', { name: 'Discovery skeleton loading' })
    .click();
  await page.getByRole('button', { name: 'Save Settings' }).click();
  await expect.poll(() => stored(accountId)).toEqual([false, false]);
  expect(await html()).not.toContain('skeleton-shimmer');
});

test('an owner turns the skeleton off in a skeleton build', async ({
  context,
}) => {
  test.skip(!skeletonBuild, 'only a skeleton build needs the owner override');
  const accountId = await signIn(context, 'e2e-admin');
  await sql`delete from user_settings where user_id = ${accountId}`;
  const skeleton = async () =>
    (await (await context.request.get('/api/discovery/bootstrap')).json())
      .viewer.skeleton;
  expect(await skeleton()).toBeUndefined();
  for (const discoverySkeleton of [false, true]) {
    const saved = await context.request.post('/api/settings', {
      data: { ...settings, discoverySkeleton },
    });
    expect(saved.status()).toBe(200);
    expect(await skeleton()).toBe(discoverySkeleton);
  }
});

test('members never see or write the dev toggles', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const member = `dev-member-${randomUUID().slice(0, 8)}`;
  await signIn(context, member);
  await page.goto('/en/settings');
  await expect(page.getByRole('button', { name: 'Privacy' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dev' })).toHaveCount(0);
  await page.goto('/en/settings#dev');
  await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible();
  for (const values of [
    { loadTracing: true },
    { discoverySkeleton: true },
    { loadTracing: false, discoverySkeleton: false },
  ]) {
    const response = await context.request.post('/api/settings', {
      data: { ...settings, ...values },
    });
    expect(response.status()).toBe(403);
  }
  const saved = await context.request.post('/api/settings', { data: settings });
  expect(saved.status()).toBe(200);
  expect(
    (await context.cookies()).find(({ name }) => name === 'polycord_dev'),
  ).toBeUndefined();
  await sql`delete from users where discord_user_id = ${member}`;
});
