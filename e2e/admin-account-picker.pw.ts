import { createHmac, randomUUID } from 'node:crypto';
import { type BrowserContext, expect, type Page, test } from '@playwright/test';
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

test.describe('admin account picker', () => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  let owner: Account;
  let alpha: Account;
  let beta: Account;
  let staff: Account;

  test.beforeAll(async () => {
    await sql`delete from users where discord_user_id = 'e2e-admin'`;
    [owner, alpha, beta, staff] = await sql<Account[]>`
      insert into users (discord_user_id, discord_username, display_name)
      values ('e2e-admin', 'e2e-admin', 'E2E Owner'),
        (${`${prefix}-alpha`}, ${`${prefix}-alpha`}, ${`${prefix} Alpha`}),
        (${`${prefix}-beta`}, ${`${prefix}-beta`}, ${`${prefix} Beta`}),
        (${`${prefix}-staff`}, ${`${prefix}-staff`}, ${`${prefix} Staff`})
      returning id, discord_user_id as "discordUserId"`;
    await sql`insert into staff_roles (user_id) values (${staff.id})`;
  });

  test.afterAll(async () => {
    await sql`delete from ip_bans where ip = '198.51.100.77'`;
    await sql`delete from users where id in ${sql([owner, alpha, beta, staff].map(({ id }) => id))}`;
    await sql.end();
  });

  const openAdmin = async (context: BrowserContext) => {
    await signIn(context, owner);
    const page = await context.newPage();
    await page.goto('/en/admin');
    return page;
  };

  const option = (page: Page, name: string) =>
    page.getByRole('option', { name: new RegExp(name) });

  test('add moderator needs a selected account and handles every state', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: 'http://localhost:3119',
    });
    const page = await openAdmin(context);
    await page.getByRole('button', { name: 'Manage staff' }).click();
    await page.getByRole('button', { name: 'Add moderator' }).click();
    const picker = page.getByRole('combobox', { name: 'Add moderator' });
    const submit = page.getByRole('button', { name: 'Add moderator' });
    await expect(submit).toBeDisabled();

    await picker.fill(`${prefix} nobody`);
    await expect(page.getByText('No matching accounts.')).toBeVisible();
    await expect(submit).toBeDisabled();

    await picker.fill(prefix);
    await expect(option(page, `${prefix} Alpha`)).toBeVisible();
    await expect(option(page, `${prefix} Beta`)).toBeVisible();
    await expect(option(page, `${prefix} Staff`)).toHaveCount(0);

    await picker.press('ArrowDown');
    await picker.press('Enter');
    await expect(picker).toHaveValue(`${prefix}-beta`);
    await expect(page.getByText(`${prefix} Beta`)).toBeVisible();
    await expect(submit).toBeEnabled();

    await picker.fill(`${prefix}-bet`);
    await expect(submit).toBeDisabled();
    await expect(option(page, `${prefix} Beta`)).toBeVisible();

    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(picker).toHaveValue('');
    await expect(submit).toBeDisabled();

    await page.route('**/api/admin/users*', (route) =>
      route.fulfill({ status: 500, body: '{}' }),
    );
    await picker.fill(`${prefix}-alpha`);
    await expect(page.getByText('Account search failed.')).toBeVisible();
    await page.unroute('**/api/admin/users*');
    await page.getByRole('button', { name: 'Retry' }).click();
    await option(page, `${prefix} Alpha`).click();
    await expect(submit).toBeEnabled();

    await submit.click();
    await expect(
      page.getByRole('button', { name: `Remove ${prefix} Alpha as moderator` }),
    ).toBeVisible();
    expect(
      await sql`select user_id from staff_roles where user_id = ${alpha.id}`,
    ).toHaveLength(1);
    await context.close();
  });

  test('enter ignores matches from the previous query', async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: 'http://localhost:3119',
    });
    const page = await openAdmin(context);
    await page.getByRole('button', { name: 'Manage staff' }).click();
    await page.getByRole('button', { name: 'Add moderator' }).click();
    const picker = page.getByRole('combobox', { name: 'Add moderator' });
    const submit = page.getByRole('button', { name: 'Add moderator' });

    await picker.fill(prefix);
    await expect(option(page, `${prefix} Beta`)).toBeVisible();

    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/admin/users*', async (route) => {
      await gate;
      await route.continue();
    });
    await picker.fill(`${prefix} nobody`);
    await expect(page.getByText('Searching accounts')).toBeVisible();
    await picker.press('Enter');
    await expect(picker).toHaveValue(`${prefix} nobody`);
    await expect(submit).toBeDisabled();

    release();
    await expect(page.getByText('No matching accounts.')).toBeVisible();
    await context.close();
  });

  test('ip blocks use the selected account', async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: 'http://localhost:3119',
    });
    const page = await openAdmin(context);
    await page.getByRole('button', { name: 'IP blocks' }).click();
    const picker = page.getByRole('combobox', {
      name: 'Pick an account to see its IP addresses',
    });
    const block = page.getByRole('button', { name: /^Block/ });

    await picker.fill(`${prefix}-bet`);
    await option(page, `${prefix} Beta`).click();
    await expect(picker).toHaveValue(`${prefix}-beta`);
    await expect(
      page.getByText('No IP addresses were recorded for this account.'),
    ).toBeVisible();

    await page.getByPlaceholder('Or enter IP addresses').fill('198.51.100.77');
    await block.click();
    await expect(page.getByText('198.51.100.77')).toBeVisible();
    await expect(picker).toHaveValue('');
    expect(
      await sql`select target_discord_user_id as "target" from ip_bans where ip = '198.51.100.77'`,
    ).toEqual([{ target: beta.discordUserId }]);
    await context.close();
  });

  test('mobile staff sheet selects an account', async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: 'http://localhost:3119',
      viewport: { width: 390, height: 844 },
    });
    const page = await openAdmin(context);
    await page.getByRole('button', { name: 'Users' }).click();
    await page.getByText('Manage staff').click();
    await page.getByRole('button', { name: 'Add moderator' }).click();
    await page
      .getByRole('combobox', { name: 'Add moderator' })
      .fill(`${prefix}-beta`);
    await option(page, `${prefix} Beta`).click();
    await expect(
      page.getByRole('button', { name: 'Add moderator' }),
    ).toBeEnabled();
    await context.close();
  });
});
