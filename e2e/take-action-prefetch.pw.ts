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

test.describe('take action prefetch', () => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = `Case${randomUUID().slice(0, 6)}`;
  let staff: Account;
  let member: Account;
  let reported: Account;
  let reporter: Account;

  test.beforeAll(async () => {
    [staff, member, reported, reporter] = await sql<Account[]>`
      insert into users (discord_user_id, discord_username, display_name)
      values (${`${prefix}-staff`}, ${`${prefix}-staff`}, ${`${prefix} Staff`}),
        (${`${prefix}-member`}, ${`${prefix}-member`}, ${`${prefix} Member`}),
        (${`${prefix}-reported`}, ${`${prefix}-reported`}, ${`${prefix} Reported`}),
        (${`${prefix}-reporter`}, ${`${prefix}-reporter`}, ${`${prefix} Reporter`})
      returning id, discord_user_id as "discordUserId"`;
    await sql`insert into staff_roles (user_id) values (${staff.id})`;
    const [profile] = await sql`
      insert into profiles (last_bumped_at, user_id, is_public, allow_anonymous_copy, primary_language, target_language, proficiency_level, bio)
      values (now(), ${reported.id}, true, false, 'en', 'ja', 'beginner', ${`${prefix} bio`}) returning id`;
    await sql`insert into reports (reporter_user_id, reported_user_id, reported_profile_id, reason, details)
      values (${reporter.id}, ${reported.id}, ${profile.id}, 'spam', 'Posting links')`;
  });

  test.afterAll(async () => {
    await sql`delete from users where id in ${sql([staff, member, reported, reporter].map(({ id }) => id))}`;
    await sql.end();
  });

  const openDiscovery = async (
    browser: import('@playwright/test').Browser,
    account: Account,
    viewport = { width: 1280, height: 720 },
  ) => {
    const context = await browser.newContext({
      baseURL: 'http://localhost:3119',
      viewport,
    });
    await signIn(context, account);
    const page = await context.newPage();
    const caseRequests: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/admin/case')
        caseRequests.push(request.url());
    });
    await page.goto(`/en?q=${encodeURIComponent(`${prefix} Reported`)}`);
    await expect(
      page.getByRole('button', { name: 'Card menu' }).first(),
    ).toBeVisible();
    return { context, page, caseRequests };
  };

  const takeAction = (page: Page) =>
    page.getByRole('button', { name: 'Take action' });
  const panel = (page: Page) =>
    page.getByRole('dialog', { name: `Moderate ${prefix} Reported` });

  test('opening the menu starts one request that the open reuses and shows the case instantly', async ({
    browser,
  }) => {
    const { context, page, caseRequests } = await openDiscovery(browser, staff);
    await page.addInitScript(() => {
      const timing = window as unknown as { pressed: number; shown: number };
      document.addEventListener(
        'click',
        () => {
          timing.pressed = performance.now();
        },
        true,
      );
      new MutationObserver(() => {
        const toolbar = document.querySelector(
          '[role="dialog"] [role="toolbar"]',
        );
        if (toolbar && !timing.shown) timing.shown = performance.now();
      }).observe(document, { childList: true, subtree: true });
    });
    await page.reload();
    await expect(
      page.getByRole('button', { name: 'Card menu' }).first(),
    ).toBeVisible();
    caseRequests.length = 0;
    await page.waitForTimeout(1000);
    expect(caseRequests).toEqual([]);

    await page.getByRole('button', { name: 'Card menu' }).first().click();
    await expect.poll(() => caseRequests.length).toBe(1);
    await page.waitForTimeout(600);
    await takeAction(page).click();
    await expect(
      panel(page).getByRole('button', { name: 'Hide profile' }),
    ).toBeVisible();
    await expect(panel(page).getByText('Posting links')).toBeVisible();
    await expect(panel(page).getByText(`${prefix} Reporter`)).toBeVisible();
    expect(caseRequests).toHaveLength(1);
    const delay = await page.evaluate(() => {
      const timing = window as unknown as { pressed: number; shown: number };
      return timing.shown - timing.pressed;
    });
    expect(delay).toBeLessThan(100);
    await context.close();
  });

  test('pressing Take action with no lead time shows the shell, then the case', async ({
    browser,
  }) => {
    const { context, page, caseRequests } = await openDiscovery(browser, staff);
    await page.route('**/api/admin/case**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await page.getByRole('button', { name: 'Card menu' }).first().click();
    await takeAction(page).click();
    await expect(
      panel(page).getByRole('heading', {
        name: `${prefix} Reported`,
        exact: true,
      }),
    ).toBeVisible();
    await expect(panel(page).locator('[aria-busy]')).toBeVisible();
    await expect(
      panel(page).getByRole('button', { name: 'Hide profile' }),
    ).toHaveCount(0);
    await expect(
      panel(page).getByRole('button', { name: 'Hide profile' }),
    ).toBeVisible();
    expect(caseRequests).toHaveLength(1);
    await context.close();
  });

  test('an action replaces the cached case and the next open shows it without a request', async ({
    browser,
  }) => {
    const { context, page, caseRequests } = await openDiscovery(browser, staff);
    await page.getByRole('button', { name: 'Card menu' }).first().click();
    await takeAction(page).click();
    await panel(page).getByRole('button', { name: 'Hide profile' }).click();
    await page
      .getByRole('dialog', { name: /Hide/ })
      .getByRole('button', { name: 'Hide profile' })
      .click();
    await expect(
      panel(page).getByRole('button', { name: 'Unhide profile' }),
    ).toBeVisible();
    await expect
      .poll(async () => {
        const [row] =
          await sql`select hidden_by_moderation from profiles where user_id = ${reported.id}`;
        return row.hidden_by_moderation;
      })
      .toBe(true);
    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeHidden();
    caseRequests.length = 0;

    await page.getByRole('button', { name: 'Card menu' }).first().click();
    await takeAction(page).click();
    await expect(
      panel(page).getByRole('button', { name: 'Unhide profile' }),
    ).toBeVisible();
    expect(caseRequests).toEqual([]);
    await sql`update profiles set hidden_by_moderation = false where user_id = ${reported.id}`;
    await context.close();
  });

  test('the mobile sheet reuses the prefetch and opens with the case', async ({
    browser,
  }) => {
    const { context, page, caseRequests } = await openDiscovery(
      browser,
      staff,
      {
        width: 390,
        height: 844,
      },
    );
    await page.getByRole('button', { name: 'Card menu' }).first().click();
    await expect.poll(() => caseRequests.length).toBe(1);
    await page.waitForTimeout(600);
    await takeAction(page).click();
    await expect(
      page.getByRole('button', { name: 'Hide profile' }),
    ).toBeVisible();
    expect(caseRequests).toHaveLength(1);
    await context.close();
  });

  test('members never prefetch or request a case and the endpoint stays hidden', async ({
    browser,
  }) => {
    const { context, page, caseRequests } = await openDiscovery(
      browser,
      member,
    );
    await page.getByRole('button', { name: 'Card menu' }).first().click();
    await expect(
      page.getByRole('button', { name: 'Report profile' }),
    ).toBeVisible();
    await expect(takeAction(page)).toHaveCount(0);
    await page.waitForTimeout(1000);
    expect(caseRequests).toEqual([]);
    const response = await context.request.get(
      '/api/admin/case?profileId=00000000-0000-4000-8000-000000000000',
    );
    expect(response.status()).toBe(404);
    await context.close();
  });
});
