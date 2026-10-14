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

for (const width of [320, 375, 390]) {
  test(`a ${width}px shared profile is visible and locked before Discovery is ready`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 812 });
    const data = await fixture();
    let releaseRoute = () => {};
    let releaseDiscovery = () => {};
    const routeGate = new Promise<void>((resolve) => {
      releaseRoute = resolve;
    });
    const discoveryGate = new Promise<void>((resolve) => {
      releaseDiscovery = resolve;
    });
    let bootstrapStarted = false;
    let profileLookups = 0;
    try {
      await page.route('**/en?*', async (route) => {
        if (route.request().headers().rsc === '1') await routeGate;
        await route.continue();
      });
      await page.route('**/api/discovery/bootstrap?*', async (route) => {
        bootstrapStarted = true;
        await discoveryGate;
        await route.continue();
      });
      page.on('request', (request) => {
        if (new URL(request.url()).pathname.startsWith('/api/profile/public/'))
          profileLookups++;
      });
      await page.goto(`/en/u/${data.actorProfile}`);
      const profile = page.getByRole('dialog', { name: 'Sheet actor' });
      await expect(profile).toBeVisible();
      await expect(
        profile.getByRole('button', { name: 'Close' }),
      ).toBeDisabled();
      await page.keyboard.press('Escape');
      await page
        .locator('.SheetOverlay')
        .last()
        .click({ position: { x: 5, y: 5 }, force: true });
      await expect(profile).toBeVisible();
      const handle = await profile
        .locator('.cursor-grab')
        .first()
        .boundingBox();
      if (!handle) throw new Error('Missing profile sheet handle');
      await page.mouse.move(handle.x + handle.width / 2, handle.y + 10);
      await page.mouse.down();
      await page.mouse.move(handle.x + handle.width / 2, handle.y + 170, {
        steps: 5,
      });
      await page.mouse.up();
      await expect(
        profile.getByRole('button', { name: 'Close' }),
      ).toBeDisabled();
      await page.screenshot({
        path: test.info().outputPath(`profile-first-${width}.png`),
      });
      releaseRoute();
      await expect(page).toHaveURL(/\/en$/);
      if (process.env.NEXT_PUBLIC_DISCOVERY_SKELETON_ENABLED !== 'false') {
        await expect.poll(() => bootstrapStarted).toBe(true);
        await expect(
          profile.getByRole('button', { name: 'Close' }),
        ).toBeDisabled();
      }
      releaseDiscovery();
      await expect(
        profile.getByRole('button', { name: 'Close' }),
      ).toBeEnabled();
      expect(profileLookups).toBe(0);
      expect(new URL(page.url()).search).toBe('');
      await profile.getByRole('button', { name: 'Close' }).click();
      await expect(profile).toHaveCount(0);
      await expect(page.locator('article:visible').first()).toBeVisible();
    } finally {
      releaseRoute();
      releaseDiscovery();
      await data.cleanup();
    }
  });
}

test('a failed background Discovery load releases the shared-profile sheet', async ({
  page,
}) => {
  test.skip(process.env.NEXT_PUBLIC_DISCOVERY_SKELETON_ENABLED === 'false');
  const data = await fixture();
  try {
    await page.route('**/api/discovery/bootstrap?*', (route) =>
      route.fulfill({ status: 503, body: '{}' }),
    );
    await page.goto(`/en/u/${data.actorProfile}`);
    await expect(page).toHaveURL(/\/en$/);
    const profile = page.getByRole('dialog', { name: 'Sheet actor' });
    await expect(profile.getByRole('button', { name: 'Close' })).toBeEnabled();
    await profile.getByRole('button', { name: 'Close' }).click();
    await expect(profile).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  } finally {
    await data.cleanup();
  }
});

test('the mobile profile sheet is present before JavaScript runs', async ({
  browser,
}) => {
  const data = await fixture();
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 375, height: 812 },
  });
  try {
    const page = await context.newPage();
    await page.goto(`http://localhost:3119/en/u/${data.actorProfile}`);
    await expect(
      page.getByRole('dialog', { name: 'Sheet actor' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close' })).toBeDisabled();
  } finally {
    await context.close();
    await data.cleanup();
  }
});
