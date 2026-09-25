import { createHmac, randomUUID } from 'node:crypto';
import { type BrowserContext, expect, test } from '@playwright/test';
import postgres from 'postgres';

const sql = postgres(process.env.TEST_DATABASE_URL as string);

const fixture = async (context: BrowserContext) => {
  const people = await sql`
    insert into users (discord_user_id, discord_username, display_name)
    values (${randomUUID().replaceAll('-', '')}, 'inbox-owner', 'Inbox owner'),
           (${randomUUID().replaceAll('-', '')}, 'inbox-actor', 'Inbox actor')
    returning id, discord_user_id, display_name`;
  const [owner, actor] = people;
  const profiles = await sql`
    insert into profiles (user_id, is_public, primary_language, target_language, proficiency_level, bio)
    values (${owner.id}, true, 'en', 'ja', 'beginner', 'An isolated inbox owner profile.'),
           (${actor.id}, true, 'ja', 'en', 'beginner', 'An isolated inbox actor profile.')
    returning id, user_id`;
  await sql`insert into user_settings (user_id, profile_view_alert) values (${owner.id}, true)`;
  await sql`insert into notifications (user_id, kind) values (${owner.id}, 'warning')`;
  const payload = Buffer.from(
    JSON.stringify({
      user: {
        id: owner.discord_user_id,
        accountId: owner.id,
        name: owner.display_name,
        username: 'inbox-owner',
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
  return {
    owner,
    actor,
    actorProfile: profiles.find((profile) => profile.user_id === actor.id)?.id,
    cleanup: () =>
      sql`delete from users where id in (${owner.id}, ${actor.id})`,
  };
};

test.afterAll(() => sql.end());

test('inbox honors server Premium on every navbar and refreshes without navigation', async ({
  page,
  context,
}, testInfo) => {
  const data = await fixture(context);
  try {
    await page.clock.install();
    await sql`insert into notifications (user_id, kind, actor_user_id, actor_name) values (${data.owner.id}, 'copy', ${data.actor.id}, 'Inbox actor')`;
    await sql`insert into subscriptions (user_id, stripe_customer_id, status, current_period_end) values (${data.owner.id}, ${randomUUID()}, 'active', ${new Date(Date.now() + 3600000)})`;
    await sql`update user_settings set hide_profile_visits = true where user_id = ${data.owner.id}`;
    await sql`insert into user_settings (user_id, profile_view_alert) values (${data.actor.id}, true)`;
    for (const route of [
      '/en',
      '/en/profile',
      '/en/saved',
      `/en/u/${data.actorProfile}`,
    ]) {
      await page.goto(route);
      await page
        .getByRole('button', { name: 'Notifications', exact: true })
        .click();
      await expect(
        page.getByText('Inbox actor copied your username'),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'View profile', exact: true }),
      ).toHaveAttribute('href', `/en/u/${data.actorProfile}`);
      await page.keyboard.press('Escape');
    }
    const hiddenVisits =
      await sql`select actor_user_id, actor_name, actor_avatar_url, is_guest from notifications where user_id = ${data.actor.id} and kind = 'view'`;
    expect(hiddenVisits).toEqual([
      {
        actor_user_id: null,
        actor_name: null,
        actor_avatar_url: null,
        is_guest: true,
      },
    ]);
    await page
      .getByRole('button', { name: 'Notifications', exact: true })
      .click();
    await sql`insert into notifications (user_id, kind, actor_user_id, actor_name) values (${data.owner.id}, 'view', ${data.actor.id}, 'Inbox actor')`;
    await page.clock.runFor(30000);
    await expect(
      page.getByText('Inbox actor viewed your profile'),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('premium-inbox.png'),
      animations: 'disabled',
    });
    await sql`update subscriptions set status = 'canceled', current_period_end = ${new Date(0)} where user_id = ${data.owner.id}`;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page.getByText('Inbox actor viewed your profile')).toHaveCount(
      0,
    );
    await expect(page.getByText('A user copied your username')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Review community guidelines' }),
    ).toBeVisible();
    await page.goto('/ja/saved');
    await page.getByRole('button', { name: /^受信ボックス/ }).click();
    await expect(page).toHaveURL('/ja/inbox');
    await page.getByRole('button', { name: /モデレーション/ }).click();
    await expect(
      page
        .getByRole('dialog')
        .getByRole('button', { name: 'コミュニティガイドラインを確認' }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('free-warning-japanese.png'),
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 320, height: 844 });
    await page.screenshot({
      path: testInfo.outputPath('free-warning-mobile.png'),
      animations: 'disabled',
    });
  } finally {
    await data.cleanup();
  }
});

test('loading, failed reads and failed writes preserve recoverable inbox state', async ({
  page,
  context,
}, testInfo) => {
  const data = await fixture(context);
  let failingMethod = 'GET';
  let finishInitialLoad = () => {};
  const initialLoad = new Promise<void>((resolve) => {
    finishInitialLoad = resolve;
  });
  try {
    await page.route('**/api/notifications', async (route) => {
      if (route.request().method() === 'GET') await initialLoad;
      if (route.request().method() === failingMethod) {
        await route.fulfill({
          status: 503,
          json: { error: 'Isolated failure' },
        });
      } else {
        await route.continue();
      }
    });
    await page.goto('/en');
    await page
      .getByRole('button', { name: 'Notifications', exact: true })
      .click();
    await expect(page.getByText('Loading notifications…')).toBeVisible();
    finishInitialLoad();
    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: 'Notifications could not be refreshed' }),
    ).toContainText('Notifications could not be refreshed');
    await expect(page.getByText('No notifications yet')).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath('load-failure.png'),
      animations: 'disabled',
    });
    failingMethod = '';
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(
      page.getByRole('link', { name: 'Review community guidelines' }),
    ).toBeVisible();
    for (const [method, action] of [
      ['PATCH', 'Mark as read'],
      ['PATCH', 'Mark all as read'],
      ['DELETE', 'Delete'],
      ['DELETE', 'Clear all'],
    ]) {
      failingMethod = method;
      await page.getByRole('button', { name: action, exact: true }).click();
      await expect(
        page
          .getByRole('alert')
          .filter({ hasText: 'Your change could not be confirmed' }),
      ).toContainText('Your change could not be confirmed');
      await expect(
        page.getByRole('button', { name: 'Mark as read', exact: true }),
      ).toBeEnabled();
      await expect(
        page.getByRole('link', { name: 'Review community guidelines' }),
      ).toBeVisible();
    }
    await page.screenshot({
      path: testInfo.outputPath('write-failure.png'),
      animations: 'disabled',
    });
    failingMethod = '';
    await page
      .getByRole('button', { name: 'Mark as read', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Mark as unread', exact: true }),
    ).toBeEnabled();
    await page.reload();
    await page
      .getByRole('button', { name: 'Notifications', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Mark as unread', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Clear all', exact: true }).click();
    await expect(page.getByText('No notifications yet')).toBeVisible();
    await page.reload();
    await page
      .getByRole('button', { name: 'Notifications', exact: true })
      .click();
    await expect(page.getByText('No notifications yet')).toBeVisible();
  } finally {
    await data.cleanup();
  }
});
