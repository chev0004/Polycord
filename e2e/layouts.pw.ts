import { createHmac, randomUUID } from 'node:crypto';
import {
  type BrowserContext,
  expect,
  type Locator,
  type Page,
  test,
} from '@playwright/test';
import postgres from 'postgres';

const sql = () => postgres(process.env.TEST_DATABASE_URL as string);

const createUser = async (name: string, premium = false, theme = 'dark') => {
  const db = sql();
  const discordId = randomUUID().replaceAll('-', '');
  const [account] =
    await db`insert into users (discord_user_id, discord_username, display_name) values (${discordId}, ${discordId}, ${name}) returning id`;
  await db`insert into user_settings (user_id, theme) values (${account.id}, ${theme})`;
  if (premium)
    await db`insert into subscriptions (user_id, stripe_customer_id, status, current_period_end) values (${account.id}, ${`cus_${discordId}`}, 'active', now() + interval '30 days')`;
  await db.end();
  return { discordId, accountId: account.id as string, name };
};

const signIn = async (
  context: BrowserContext,
  user: { discordId: string; accountId: string; name: string },
) => {
  const payload = Buffer.from(
    JSON.stringify({
      user: {
        id: user.discordId,
        accountId: user.accountId,
        name: user.name,
        username: user.name,
      },
      expiresAt: Date.now() + 3600000,
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', 'polycord-isolated-audit-secret')
    .update(payload)
    .digest('base64url');
  await context.clearCookies();
  await context.addCookies([
    {
      name: 'polycord_session',
      value: `${payload}.${signature}`,
      domain: 'localhost',
      path: '/',
    },
  ]);
};

const removeUsers = async (ids: string[]) => {
  const db = sql();
  await db`delete from users where id in ${db(ids)}`;
  await db.end();
};

const fitsWidth = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );

const overlaps = async (a: Locator, b: Locator) => {
  const [first, second] = await Promise.all([a.boundingBox(), b.boundingBox()]);
  if (!first || !second) return true;
  return !(
    first.x + first.width <= second.x ||
    second.x + second.width <= first.x ||
    first.y + first.height <= second.y ||
    second.y + second.height <= first.y
  );
};

test('plan comparison stays readable across widths, locales, themes and plans', async ({
  page,
  context,
}, testInfo) => {
  const free = await createUser('Layout Free');
  const premium = await createUser('Layout Premium', true, 'light');
  try {
    for (const [user, locale] of [
      [free, 'en'],
      [premium, 'ja'],
    ] as const) {
      await signIn(context, user);
      for (const width of [320, 375, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(`/${locale}/settings#premium`);
        const table = page.getByRole('table');
        await expect(table).toBeVisible();
        for (const row of await table.getByRole('row').all()) {
          const header = row.getByRole('rowheader');
          if ((await header.count()) === 0) continue;
          const cells = row.getByRole('cell');
          const box = await header.boundingBox();
          expect(box?.width).toBeGreaterThanOrEqual(120);
          expect(await overlaps(header, cells.nth(0))).toBe(false);
          expect(await overlaps(header, cells.nth(1))).toBe(false);
          expect(await overlaps(cells.nth(0), cells.nth(1))).toBe(false);
        }
        expect(await fitsWidth(page)).toBe(true);
        await table.scrollIntoViewIfNeeded();
        await page.screenshot({
          path: testInfo.outputPath(`compare-${locale}-${width}.png`),
          animations: 'disabled',
        });
      }
    }
  } finally {
    await removeUsers([free.accountId, premium.accountId]);
  }
});

test('touch, keyboard, dialog and error states stay reachable on phones', async ({
  page,
  context,
}, testInfo) => {
  const viewer = await createUser('Layout Viewer');
  const longName = `Layout ${'Partner'.repeat(6)}`;
  const owner = await createUser(longName);
  const db = sql();
  try {
    await db`insert into profiles (user_id,is_public,primary_language,target_language,proficiency_level,bio,tags,country,timezone)
      values (${owner.accountId},true,'en','ja','intermediate',${'A long biography that keeps going to test wrapping on narrow screens. '.repeat(7)},array['Travel','Cooking','Photography','Music','Hiking'],'US','America/Chicago')`;
    await db`insert into notifications (user_id, kind, actor_name) values (${viewer.accountId}, 'copy', 'Someone')`;
    await signIn(context, viewer);
    await page.setViewportSize({ width: 320, height: 480 });

    await page.goto(`/en?q=${encodeURIComponent(longName)}`);
    await expect(page.getByText('1 partner', { exact: true })).toBeVisible();
    expect(await fitsWidth(page)).toBe(true);
    await page
      .getByRole('button', { name: 'Dismiss onboarding prompt' })
      .click();

    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: /^Inbox/ })
      .click();
    const entry = page.getByRole('button', {
      name: /A user copied your username/,
    });
    await expect(entry).toBeInViewport();
    expect(await fitsWidth(page)).toBe(true);
    await entry.click();
    await expect(
      page.getByRole('dialog').getByRole('button', { name: 'Mark as unread' }),
    ).toBeInViewport();
    await page.screenshot({
      path: testInfo.outputPath('inbox-320.png'),
      animations: 'disabled',
    });
    await page.keyboard.press('Escape');
    await page.goBack();

    const cardMenu = page.getByRole('button', { name: 'Card menu' }).first();
    await cardMenu.click();
    await page.getByRole('button', { name: 'Report profile' }).click();
    const dialog = page.getByRole('dialog', { name: 'Report profile' });
    await expect(dialog).toBeVisible();
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox?.y).toBeGreaterThanOrEqual(0);
    expect((dialogBox?.y ?? 0) + (dialogBox?.height ?? 0)).toBeLessThanOrEqual(
      480,
    );
    const submit = dialog.getByRole('button', {
      name: 'Submit report',
      exact: true,
    });
    await submit.scrollIntoViewIfNeeded();
    await expect(submit).toBeInViewport();
    await page.screenshot({
      path: testInfo.outputPath('report-320x480.png'),
      animations: 'disabled',
    });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(cardMenu).toBeFocused();

    const sort = page.getByRole('button', { name: /^Sort by/ });
    const before = await sort.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    await sort.focus();
    await expect
      .poll(() => sort.evaluate((el) => getComputedStyle(el).backgroundColor))
      .not.toBe(before);

    await page.goto('/en/settings');
    await page.getByRole('button', { name: /^Email Address/ }).click();
    const email = page.getByRole('dialog').getByLabel('Email Address');
    await email.fill('not-an-email');
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(email).toHaveAccessibleDescription(
      'Please enter a valid email address.',
    );

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/en');
    await page.getByRole('button', { name: 'Change language' }).click();
    const popover = page.locator('.PopoverContent');
    await expect(popover).toBeVisible();
    expect(
      Number.parseFloat(
        await popover.evaluate((el) => getComputedStyle(el).animationDuration),
      ),
    ).toBeLessThan(0.001);

    await page.emulateMedia({ reducedMotion: null });
    await page.setViewportSize({ width: 320, height: 844 });
    const [ownerProfile] =
      await db`select id from profiles where user_id = ${owner.accountId}`;
    await page.goto(`/en/u/${ownerProfile.id}`);
    await expect(
      page.getByRole('heading', { name: longName, exact: true }),
    ).toBeVisible();
    expect(await fitsWidth(page)).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath('long-profile-320.png'),
      fullPage: true,
      animations: 'disabled',
    });
  } finally {
    await db.end();
    await removeUsers([viewer.accountId, owner.accountId]);
  }
});
