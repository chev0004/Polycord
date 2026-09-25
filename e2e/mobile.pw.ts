import { createHmac, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

for (const width of [320, 375, 390]) {
  test(`core routes and popovers fit at ${width}px`, async ({
    page,
    context,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/en');
    const brand = await page
      .getByRole('button', { name: 'Polycord', exact: true })
      .boundingBox();
    const language = await page
      .getByRole('button', { name: 'Change language' })
      .boundingBox();
    expect((brand?.x ?? 0) + (brand?.width ?? 0)).toBeLessThan(
      language?.x ?? 0,
    );
    const id = randomUUID().replaceAll('-', '');
    const accountId = randomUUID();
    const sql = postgres(process.env.TEST_DATABASE_URL as string);
    await sql`insert into users (id, discord_user_id, discord_username, display_name) values (${accountId}, ${id}, ${id}, 'Mobile test')`;
    const payload = Buffer.from(
      JSON.stringify({
        user: { id, accountId, name: 'Mobile test' },
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
    const fits = async () => {
      await expect(
        page.locator('main').getByRole('heading').first(),
      ).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(width);
    };
    try {
      const created = await context.request.post('/api/profile', {
        data: {
          isPublic: true,
          allowAnonymousCopy: true,
          displayTimezone: true,
          displayAvailability: false,
          primaryLanguage: 'ja',
          targetLanguages: [{ language: 'en', level: 'intermediate' }],
          bio: 'Looking for a patient English conversation partner.',
          tags: ['Cooking'],
          country: 'JP',
          timezone: 'Asia/Tokyo',
        },
      });
      expect(created.status()).toBe(200);
      const { profileId } = await created.json();
      for (const route of ['/en/saved', `/en/u/${profileId}`]) {
        await page.goto(route);
        await fits();
      }
      await page.goto('/en');
      await fits();
      for (const name of ['Change language', 'Card menu']) {
        await page.getByRole('button', { name, exact: true }).first().click();
        const popover =
          name === 'Card menu'
            ? page.getByRole('dialog')
            : page.locator('[data-radix-popper-content-wrapper]').last();
        await expect(popover).toBeVisible();
        const bounds = await popover.boundingBox();
        expect(bounds?.x).toBeGreaterThanOrEqual(0);
        expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(
          width,
        );
        await page.screenshot({
          path: testInfo.outputPath(`${name}.png`),
          animations: 'disabled',
        });
        await page.keyboard.press('Escape');
      }
      for (const route of ['profile', 'settings']) {
        await page.goto(`/en/${route}`);
        await fits();
        if (route === 'profile') {
          const language = page.getByRole('combobox', {
            name: 'Target Languages 1',
          });
          await expect(language).toBeVisible();
          expect((await language.boundingBox())?.width).toBeGreaterThan(150);
          await page.screenshot({
            path: testInfo.outputPath('profile-fields.png'),
            animations: 'disabled',
          });
        }
        const field =
          route === 'profile'
            ? page.getByLabel('Bio', { exact: true })
            : page.getByLabel('Email Address');
        await field.fill(
          route === 'profile'
            ? 'Updated mobile profile with a useful description.'
            : 'mobile@example.com',
        );
        const save = page.getByRole('button', {
          name: route === 'profile' ? 'Save Profile' : 'Save Settings',
          exact: true,
        });
        await save.scrollIntoViewIfNeeded();
        await expect(save).toBeInViewport();
        const bounds = await save.boundingBox();
        expect(bounds?.height).toBeGreaterThanOrEqual(40);
        const status = await page
          .getByText('You have unsaved changes', { exact: true })
          .boundingBox();
        expect((status?.y ?? 0) + (status?.height ?? 0)).toBeLessThanOrEqual(
          bounds?.y ?? 0,
        );
        expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(
          width,
        );
        await fits();
        await page.screenshot({
          path: testInfo.outputPath(`${route}-save.png`),
          animations: 'disabled',
        });
        const response = page.waitForResponse(
          (r) =>
            r.url().endsWith(`/api/${route}`) &&
            r.request().method() === 'POST',
        );
        await save.click();
        expect((await response).status()).toBe(200);
      }
    } finally {
      await sql`delete from users where discord_user_id = ${id}`;
      await sql.end();
    }
  });
}

test('dock and filter sheets drive discovery on phones', async ({
  page,
  context,
}, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const id = randomUUID().replaceAll('-', '');
  const prefix = id.slice(0, 8);
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const [viewer] =
    await sql`insert into users (discord_user_id, discord_username, display_name) values (${id}, ${id}, 'Dock test') returning id`;
  const owners =
    await sql`insert into users (discord_user_id, discord_username, display_name)
    select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Partner ' || n from generate_series(1,12) n returning id`;
  const payload = Buffer.from(
    JSON.stringify({
      user: { id, accountId: viewer.id, name: 'Dock test' },
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
  try {
    await sql`insert into profiles (user_id,is_public,primary_language,target_language,proficiency_level,bio,tags,country,timezone)
      select id,true,'en','ja','intermediate','A mobile dock fixture profile.',array[${prefix}],case when row_number() over () = 1 then 'JP' else 'US' end,'America/Chicago' from users where id in ${sql(owners.map((owner) => owner.id))}`;
    await page.goto(`/en?tag=${prefix}`);
    await expect(page.getByText('12 partners', { exact: true })).toBeVisible();
    await page
      .getByRole('button', { name: 'Dismiss onboarding prompt' })
      .click();
    const toTop = page.locator('button[aria-label^="Back to top"]');
    await expect(toTop).toHaveCSS('opacity', '0');
    await page.evaluate(() => window.scrollTo(0, 900));
    await expect(toTop).toHaveCSS('opacity', '1');
    await toTop.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(toTop).toHaveCSS('opacity', '0');

    await expect(page.locator('article')).toHaveCount(9);
    await page.getByRole('button', { name: 'Show more partners' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.locator('article')).toHaveCount(12);
    await expect(
      page.getByText("You've seen everyone who matches.", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator('article')).toHaveCount(12);

    const dock = page.getByRole('navigation', { name: 'Main' });
    await expect(dock).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Account menu' }),
    ).toHaveCount(0);

    await page.getByRole('button', { name: /^Filters/ }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    for (const level of ['Beginner', 'Intermediate'])
      await sheet.getByRole('button', { name: level, exact: true }).click();
    for (const level of ['Beginner', 'Intermediate'])
      await expect(
        sheet.getByRole('button', { name: level, exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
    await sheet.getByRole('button', { name: /^Country/ }).click();
    await sheet.getByRole('textbox', { name: 'Country' }).fill('Japan');
    await sheet.getByRole('button', { name: 'Japan', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Show 1 partner', exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('filter-sheet.png'),
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'Show 1 partner' }).click();
    await expect(page).toHaveURL(/country=JP/);
    await expect(page).toHaveURL(/level=beginner&level=intermediate/);
    await expect(page.getByText('1 partner', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Remove Japan', exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('discovery-filtered.png'),
      animations: 'disabled',
    });

    await page.getByRole('button', { name: /^Sort by/ }).click();
    await page.getByRole('button', { name: 'Name (Z-A)', exact: true }).click();
    await expect(page).toHaveURL(/sort=name-desc/);

    await dock.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page).toHaveURL('/en/settings');
    await dock.getByRole('button', { name: 'Your Card', exact: true }).click();
    await expect(page).toHaveURL('/en/profile');
    await dock.getByRole('button', { name: 'Discover', exact: true }).click();
    await expect(page).toHaveURL('/en');
    await expect(
      dock.getByRole('button', { name: 'Discover' }),
    ).toHaveAttribute('aria-current', 'page');
  } finally {
    await sql`delete from users where id in ${sql([viewer.id, ...owners.map((owner) => owner.id)])}`;
    await sql.end();
  }
});
