import { createHmac, randomUUID } from 'node:crypto';
import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import postgres from 'postgres';

const ORIGIN = 'http://localhost:3119';
const sql = postgres(process.env.TEST_DATABASE_URL as string);

type Account = { id: string; discordUserId: string };

const sessionFor = ({ id, discordUserId }: Account) => {
  const payload = Buffer.from(
    JSON.stringify({
      user: {
        id: discordUserId,
        accountId: id,
        name: discordUserId,
        username: discordUserId,
      },
      issuedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', 'polycord-isolated-audit-secret')
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
};

const signIn = (context: BrowserContext, account: Account) =>
  context.addCookies([
    { name: 'polycord_session', value: sessionFor(account), url: ORIGIN },
  ]);

const warnedMember = async () => {
  const [member] = await sql<
    Account[]
  >`insert into users (discord_user_id, discord_username, display_name)
    values (${randomUUID().replaceAll('-', '')}, 'warned-member', 'Warned member')
    returning id, discord_user_id as "discordUserId"`;
  const [notice] =
    await sql`insert into notifications (user_id, kind, message, warning_category)
      values (${member.id}, 'warning', 'Harassment', 'harassment') returning id`;
  return { member, noticeId: notice.id as string };
};

const dialog = (page: Page) => page.getByRole('alertdialog');
const acknowledgement = (page: Page) =>
  page.getByText('I have read and understand this warning.');

test.afterAll(() => sql.end());

for (const [name, viewport] of [
  ['desktop', { width: 1280, height: 800 }],
  ['mobile', { width: 375, height: 812 }],
] as const) {
  test(`a warned member must acknowledge the notice before using the site on ${name}`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize(viewport);
    const { member, noticeId } = await warnedMember();
    try {
      await signIn(context, member);
      await page.goto('/en');

      await expect(dialog(page)).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Harassment Offense Warning' }),
      ).toBeVisible();
      const checkbox = page.getByRole('checkbox');
      const proceed = page.getByRole('button', { name: 'Continue' });
      await expect(checkbox).not.toBeFocused();
      await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(0);
      await expect(proceed).toBeDisabled();

      const panel = await dialog(page).locator('.WarningNotice').boundingBox();
      if (name === 'mobile') expect(panel?.width).toBe(viewport.width);
      else expect(panel?.width).toBeLessThanOrEqual(540);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(viewport.width);

      await page.keyboard.press('Escape');
      await page.mouse.click(2, 2);
      await expect(dialog(page)).toBeVisible();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expect(dialog(page)).toContainText('Note from moderation');
      expect(
        await page.evaluate(
          () =>
            document.activeElement?.closest('[role="alertdialog"]') !== null,
        ),
      ).toBe(true);

      await acknowledgement(page).click();
      await expect(proceed).toBeEnabled();
      await proceed.click();
      await expect(dialog(page)).toBeHidden();

      const [row] =
        await sql`select acknowledged_at, read from notifications where id = ${noticeId}`;
      expect(row.acknowledged_at).not.toBeNull();
      expect(row.read).toBe(true);

      await page.reload();
      await expect(page.getByRole('main')).toBeVisible();
      await expect(dialog(page)).toHaveCount(0);
    } finally {
      await sql`delete from users where id = ${member.id}`;
    }
  });
}

test('a second pending warning needs its own acknowledgement', async ({
  page,
  context,
}) => {
  const { member } = await warnedMember();
  try {
    await sql`insert into notifications (user_id, kind, message, warning_category)
      values (${member.id}, 'warning', 'Harassment', 'harassment')`;
    await signIn(context, member);
    await page.goto('/en');
    await expect(dialog(page)).toBeVisible();

    await acknowledgement(page).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('checkbox')).not.toBeChecked();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await expect(dialog(page)).toBeVisible();
  } finally {
    await sql`delete from users where id = ${member.id}`;
  }
});

test('the inbox row stays pinned until acknowledged and then reopens the notice read-only', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const { member, noticeId } = await warnedMember();
  try {
    await sql`insert into notifications (user_id, kind) values (${member.id}, 'copy')`;
    await signIn(context, member);
    await page.goto('/en/inbox');
    await expect(dialog(page)).toBeVisible();

    await acknowledgement(page).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(dialog(page)).toBeHidden();

    const row = page.getByRole('button', { name: /Note from moderation/ });
    await expect(row).toBeVisible();
    await row.click();
    await expect(dialog(page)).toBeVisible();
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(dialog(page)).toBeHidden();

    await page.getByRole('button', { name: 'Clear all' }).click();
    await expect(row).toBeHidden();
    expect(
      await sql`select 1 from notifications where id = ${noticeId}`,
    ).toHaveLength(0);
  } finally {
    await sql`delete from users where id = ${member.id}`;
  }
});

test('an unacknowledged notice survives mark all as read and clear all', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const { member, noticeId } = await warnedMember();
  try {
    await signIn(context, member);
    await page.goto('/en/inbox');
    await expect(dialog(page)).toBeVisible();

    const response = await context.request.patch('/api/notifications', {
      data: { all: true },
    });
    expect(response.status()).toBe(200);
    await context.request.delete('/api/notifications', {
      data: { all: true },
    });
    const [row] =
      await sql`select read, acknowledged_at from notifications where id = ${noticeId}`;
    expect(row.read).toBe(false);
    expect(row.acknowledged_at).toBeNull();
  } finally {
    await sql`delete from users where id = ${member.id}`;
  }
});

test('a warning that arrives while signed in opens the notice and stores its category', async ({
  page,
  context,
  browser,
}) => {
  await sql`delete from users where discord_user_id = 'e2e-admin'`;
  const [admin] = await sql<
    Account[]
  >`insert into users (discord_user_id, discord_username, display_name)
    values ('e2e-admin', 'e2e-admin', 'E2E Admin') returning id, discord_user_id as "discordUserId"`;
  const [member] = await sql<
    Account[]
  >`insert into users (discord_user_id, discord_username, display_name)
    values (${randomUUID().replaceAll('-', '')}, 'warned-live', 'Warned live')
    returning id, discord_user_id as "discordUserId"`;
  const staff = await browser.newContext({
    baseURL: ORIGIN,
    extraHTTPHeaders: { Origin: ORIGIN },
  });
  try {
    await signIn(context, member);
    await signIn(staff, admin);
    await page.goto('/en');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(dialog(page)).toHaveCount(0);

    const warned = await staff.request.post('/api/admin/moderation', {
      data: {
        userId: member.id,
        action: 'warn',
        note: 'Harassment',
        category: 'harassment',
      },
    });
    expect(warned.status()).toBe(200);
    const [stored] =
      await sql`select warning_category from notifications where user_id = ${member.id}`;
    expect(stored.warning_category).toBe('harassment');

    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(dialog(page)).toBeVisible();

    await staff.request.post('/api/admin/moderation', {
      data: { userId: member.id, action: 'warn', note: 'Spam' },
    });
    const [custom] =
      await sql`select count(*)::int as count from notifications where user_id = ${member.id} and warning_category is null`;
    expect(custom.count).toBe(1);
    await sql`delete from moderation_actions where admin_user_id = ${admin.id}`;
  } finally {
    await staff.close();
    await sql`delete from users where id in (${member.id}, ${admin.id})`;
  }
});
