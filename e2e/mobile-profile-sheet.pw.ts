import { createHmac, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

const sql = postgres(process.env.TEST_DATABASE_URL as string);

test.use({ viewport: { width: 375, height: 812 } });
test.afterAll(() => sql.end());

const fixture = async () => {
  const people = await sql`
    insert into users (discord_user_id, discord_username, display_name)
    values (${randomUUID().replaceAll('-', '')}, 'sheet-owner', 'Sheet owner'),
           (${randomUUID().replaceAll('-', '')}, 'sheet-actor', 'Sheet actor')
    returning id, discord_user_id, display_name`;
  const [owner, actor] = people;
  const profiles = await sql`
    insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio)
    values (now(), ${owner.id}, true, 'en', 'ja', 'beginner', 'The sheet owner profile.'),
           (now(), ${actor.id}, true, 'ja', 'en', 'beginner', 'The sheet actor profile.')
    returning id, user_id`;
  await sql`insert into notifications (user_id, kind, acknowledged_at) values (${owner.id}, 'warning', now())`;
  await sql`insert into subscriptions (user_id, stripe_customer_id, status, current_period_end) values (${owner.id}, ${randomUUID()}, 'active', ${new Date(Date.now() + 3600000)})`;
  await sql`insert into notifications (user_id, kind, actor_user_id, actor_name) values (${owner.id}, 'copy', ${actor.id}, 'Sheet actor')`;
  const payload = Buffer.from(
    JSON.stringify({
      user: {
        id: owner.discord_user_id,
        accountId: owner.id,
        name: owner.display_name,
        username: 'sheet-owner',
      },
      expiresAt: Date.now() + 3600000,
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', 'polycord-isolated-audit-secret')
    .update(payload)
    .digest('base64url');
  return {
    owner,
    actor,
    actorProfile: profiles.find((profile) => profile.user_id === actor.id)
      ?.id as string,
    cookie: `${payload}.${signature}`,
    cleanup: () =>
      sql`delete from users where id in (${owner.id}, ${actor.id})`,
  };
};

test('a direct mobile public profile link lands on Discovery with the sheet open', async ({
  page,
}) => {
  const data = await fixture();
  try {
    await page.goto(`/en/u/${data.actorProfile}`);
    await expect(page).toHaveURL(/\/en$/);
    await expect(
      page.getByRole('dialog', { name: 'Sheet actor' }),
    ).toBeVisible();
    expect(new URL(page.url()).search).toBe('');
    expect(new URL(page.url()).hash).toBe('');
    await page.goBack();
    await expect(page).not.toHaveURL(/\/u\//);
  } finally {
    await data.cleanup();
  }
});

test('the mobile inbox opens a profile sheet over the current page', async ({
  page,
  context,
}) => {
  const data = await fixture();
  let releaseProfile = () => {};
  const profileGate = new Promise<void>((resolve) => {
    releaseProfile = resolve;
  });
  let profileRequests = 0;
  try {
    await page.route('**/api/profile/public/*', async (route) => {
      profileRequests++;
      await profileGate;
      await route.continue();
    });
    await context.addCookies([
      {
        name: 'polycord_session',
        value: data.cookie,
        domain: 'localhost',
        path: '/',
      },
    ]);
    await page.goto('/en/saved');
    await page.getByRole('button', { name: /^Inbox/ }).click();
    await page
      .getByRole('button', { name: /Sheet actor copied your username/ })
      .click();
    await page.getByRole('button', { name: 'View profile' }).click();
    const loading = page.getByRole('dialog', { name: 'Loading profile...' });
    await expect(loading).toBeVisible({
      timeout: 1000,
    });
    expect(profileRequests).toBe(1);
    await loading.getByRole('button', { name: 'Close' }).click();
    await expect(loading).toHaveCount(0);
    const loaded = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname ===
        `/api/profile/public/${data.actorProfile}`,
    );
    releaseProfile();
    await loaded;
    await expect(page.getByRole('dialog', { name: 'Sheet actor' })).toHaveCount(
      0,
    );
    await page
      .getByRole('button', { name: /Sheet actor copied your username/ })
      .click();
    await page.getByRole('button', { name: 'View profile' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Sheet actor' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/en\/saved$/);
    await page
      .getByRole('dialog', { name: 'Sheet actor' })
      .getByRole('button', { name: 'Close' })
      .click();
    await expect(page.getByRole('dialog', { name: 'Sheet actor' })).toHaveCount(
      0,
    );
    await expect(page.getByRole('dialog', { name: 'Inbox' })).toBeVisible();
    await expect(page).toHaveURL(/\/en\/saved$/);
    await page
      .getByRole('button', { name: /Sheet actor copied your username/ })
      .click();
    await page.getByRole('button', { name: 'View profile' }).click();
    await expect(page.getByRole('dialog', { name: 'Sheet actor' })).toBeVisible(
      { timeout: 1000 },
    );
    expect(profileRequests).toBe(1);
  } finally {
    releaseProfile();
    await data.cleanup();
  }
});

test('an unavailable profile has no public API payload', async ({
  request,
}) => {
  const response = await request.get(`/api/profile/public/${randomUUID()}`);
  expect(response.status()).toBe(404);
});
