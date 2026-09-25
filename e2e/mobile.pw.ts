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
      await page.goto('/en/profile');
      await fits();
      await page.getByRole('button', { name: 'Edit Bio', exact: true }).click();
      await page
        .getByRole('textbox', { name: 'Bio', exact: true })
        .fill('Updated mobile profile with a useful description.');
      await page.getByRole('button', { name: 'Done', exact: true }).click();
      const saveProfile = page.getByRole('button', {
        name: 'Save',
        exact: true,
      });
      await expect(saveProfile).toBeInViewport();
      expect((await saveProfile.boundingBox())?.height).toBeGreaterThanOrEqual(
        40,
      );
      await fits();
      await page.screenshot({
        path: testInfo.outputPath('profile-save.png'),
        animations: 'disabled',
      });
      const profileSaved = page.waitForResponse(
        (r) =>
          r.url().endsWith('/api/profile') && r.request().method() === 'POST',
      );
      await saveProfile.click();
      expect((await profileSaved).status()).toBe(200);
      await expect(saveProfile).toHaveCount(0);

      await page.goto('/en/settings');
      await fits();
      await page.getByRole('button', { name: /^Email Address/ }).click();
      await page
        .getByRole('dialog')
        .getByLabel('Email Address')
        .fill('mobile@example.com');
      await page.getByRole('button', { name: 'Done', exact: true }).click();
      const save = page.getByRole('button', { name: 'Save', exact: true });
      await expect(save).toBeInViewport();
      const bounds = await save.boundingBox();
      expect(bounds?.height).toBeGreaterThanOrEqual(40);
      expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(
        width,
      );
      const dock = await page
        .getByRole('navigation', { name: 'Main' })
        .boundingBox();
      expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual(
        dock?.y ?? 0,
      );
      await fits();
      await page.screenshot({
        path: testInfo.outputPath('settings-save.png'),
        animations: 'disabled',
      });
      const settingsSaved = page.waitForResponse(
        (r) =>
          r.url().endsWith('/api/settings') && r.request().method() === 'POST',
      );
      await save.click();
      expect((await settingsSaved).status()).toBe(200);
      await expect(save).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: /^Email Address/ }),
      ).toContainText('mobile@example.com');
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
    await page.getByRole('button', { name: 'Profile options' }).click();
    await page
      .getByRole('button', { name: 'Saved profiles', exact: true })
      .click();
    await expect(page).toHaveURL('/en/saved');
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

test('settings drill-in pages reach and save every setting on phones', async ({
  page,
  context,
}, testInfo) => {
  const id = randomUUID().replaceAll('-', '');
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const [owner] =
    await sql`insert into users (discord_user_id, discord_username, display_name, email) values (${id}, ${id}, 'Settings phone', 'phone@example.com') returning id`;
  const payload = Buffer.from(
    JSON.stringify({
      user: { id, accountId: owner.id, name: 'Settings phone' },
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
  const main = page.getByRole('main');
  const fits = (width: number) =>
    expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(width);
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

    for (const width of [320, 375, 390]) {
      await page.setViewportSize({ width, height: 812 });
      for (const [locale, pages] of [
        ['en', ['Privacy', 'Notifications', 'Premium']],
        ['ja', ['プライバシー', '通知', 'プレミアム']],
      ] as const) {
        await page.goto(`/${locale}/settings`);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await fits(width);
        for (const name of pages) {
          await main
            .getByRole('button', { name: new RegExp(`^${name}`) })
            .click();
          await expect(
            page.getByRole('heading', { level: 1, name, exact: true }),
          ).toBeVisible();
          await fits(width);
          await page.screenshot({
            path: testInfo.outputPath(`${locale}-${width}-${name}.png`),
            animations: 'disabled',
          });
          await page.goBack();
          await expect(
            page.getByRole('heading', { level: 1, name, exact: true }),
          ).toHaveCount(0);
        }
      }
    }

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/en/settings');
    await main.getByRole('button', { name: /^Privacy/ }).click();
    await main.getByRole('switch', { name: 'Make Profile Public' }).click();
    await main.getByRole('switch', { name: 'Hidden browsing' }).click();
    await expect(page).toHaveURL(/#premium$/);
    await expect(page.getByRole('table')).toBeVisible();
    await expect(
      main.getByRole('button', { name: 'Upgrade', exact: true }),
    ).toBeVisible();
    await main.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page).toHaveURL(/#privacy$/);
    await main.getByRole('button', { name: 'Settings', exact: true }).click();
    await main.getByRole('button', { name: /^Notifications/ }).click();
    await main
      .getByRole('switch', { name: 'Profile Interaction Alert' })
      .click();
    await main.getByRole('button', { name: 'Settings', exact: true }).click();
    for (const [row, option] of [
      ['Theme', 'Light Mode'],
      ['Time Format', '12-hour'],
      ['Language Names', 'Short codes'],
    ]) {
      await main.getByRole('button', { name: new RegExp(`^${row}`) }).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: option, exact: true })
        .click();
      await expect(
        main.getByRole('button', { name: new RegExp(`^${row}`) }),
      ).toContainText(option);
    }
    await expect(main.getByRole('button', { name: /^Privacy/ })).toContainText(
      'Unlisted',
    );
    const saved = page.waitForResponse(
      (r) =>
        r.url().endsWith('/api/settings') && r.request().method() === 'POST',
    );
    await main.getByRole('button', { name: 'Save', exact: true }).click();
    expect((await saved).status()).toBe(200);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(main.getByRole('button', { name: /^Privacy/ })).toContainText(
      'Unlisted',
    );
    await expect(
      main.getByRole('button', { name: /^Notifications/ }),
    ).toContainText('0 on');
    await page.screenshot({
      path: testInfo.outputPath('settings-light.png'),
      animations: 'disabled',
    });
    const [settings] =
      await sql`select theme, time_format, language_display, profile_interaction_alert from user_settings where user_id = ${owner.id}`;
    expect(settings).toMatchObject({
      theme: 'light',
      time_format: '12hr',
      language_display: 'short',
      profile_interaction_alert: false,
    });
    const [profile] =
      await sql`select is_public from profiles where user_id = ${owner.id}`;
    expect(profile.is_public).toBe(false);

    await main.getByRole('button', { name: /^Application Language/ }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /\(JA\)$/ })
      .click();
    await main.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL('/ja/settings');
    await expect(
      page.getByRole('heading', { level: 1, name: '設定' }),
    ).toBeVisible();

    await main.getByRole('button', { name: /^アカウントを削除/ }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    await sheet
      .getByRole('button', { name: 'キャンセル', exact: true })
      .click();
    await expect(sheet).toHaveCount(0);
  } finally {
    await sql`delete from users where id = ${owner.id}`;
    await sql.end();
  }
});

test('your card edits every profile part through sheets on phones', async ({
  page,
  context,
}, testInfo) => {
  const id = randomUUID().replaceAll('-', '');
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const [owner] =
    await sql`insert into users (discord_user_id, discord_username, display_name) values (${id}, ${id}, 'Card phone') returning id`;
  const payload = Buffer.from(
    JSON.stringify({
      user: { id, accountId: owner.id, name: 'Card phone' },
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
  const main = page.getByRole('main');
  const sheet = page.getByRole('dialog');
  const done = () =>
    sheet.getByRole('button', { name: 'Done', exact: true }).click();
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

    for (const width of [320, 375, 390]) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto('/en/profile');
      await expect(
        page.getByRole('heading', { level: 1, name: 'Your Card' }),
      ).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(width);
      await page.screenshot({
        path: testInfo.outputPath(`card-${width}.png`),
        animations: 'disabled',
      });
    }

    await main.getByRole('button', { name: 'Edit Languages' }).click();
    await sheet.getByRole('button', { name: 'Advanced', exact: true }).click();
    await sheet.getByRole('button', { name: 'Add a language' }).click();
    await sheet.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(
      sheet.getByRole('button', { name: 'Add a language' }),
    ).toBeVisible();
    await sheet.getByRole('button', { name: 'Add a language' }).click();
    await sheet.getByRole('textbox', { name: 'Choose a language' }).fill('Kor');
    await sheet.getByRole('button', { name: 'Korean', exact: true }).click();
    await expect(sheet.getByText(/free limit of 2 languages/)).toBeVisible();
    await expect(
      sheet.getByRole('button', { name: 'Add a language' }),
    ).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath('languages-sheet.png'),
      animations: 'disabled',
    });
    await done();

    await main.getByRole('button', { name: 'Edit Interests & Topics' }).click();
    await sheet
      .getByRole('textbox', { name: 'Interests & Topics' })
      .fill('Hiking');
    await sheet.getByRole('button', { name: 'Add Tag' }).click();
    await done();

    await main.getByRole('button', { name: 'Edit Location' }).click();
    await sheet.getByRole('button', { name: 'Japan' }).click();
    await sheet.getByRole('textbox', { name: 'Country' }).fill('Canada');
    await sheet.getByRole('button', { name: 'Canada', exact: true }).click();
    await done();

    await main.getByRole('button', { name: 'Add your free time' }).click();
    await sheet.getByRole('switch', { name: 'Free Time' }).click();
    await done();

    await main.getByRole('button', { name: 'Public' }).click();
    await sheet.getByRole('switch', { name: 'Display availability' }).click();
    await sheet.getByRole('button', { name: 'Close' }).click();

    await main.getByRole('button', { name: 'Edit Bio' }).click();
    await main.getByRole('textbox', { name: 'Bio' }).fill('Too short');
    await main.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(
      main.getByText('Please enter at least 10 characters for your bio.'),
    ).toBeVisible();
    await main
      .getByRole('textbox', { name: 'Bio' })
      .fill('Updated from the mobile card editor.');
    await main.getByRole('button', { name: 'Done', exact: true }).click();

    await main.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(main.locator('article')).toContainText(
      'Updated from the mobile card editor.',
    );
    await expect(main.locator('article')).toContainText('Hiking');
    await page.screenshot({
      path: testInfo.outputPath('card-preview.png'),
      animations: 'disabled',
    });

    const saved = page.waitForResponse(
      (r) =>
        r.url().endsWith('/api/profile') && r.request().method() === 'POST',
    );
    await main.getByRole('button', { name: 'Save', exact: true }).click();
    expect((await saved).status()).toBe(200);
    const [profile] =
      await sql`select bio, tags, country, display_availability, availability_days from profiles where user_id = ${owner.id}`;
    expect(profile).toMatchObject({
      bio: 'Updated from the mobile card editor.',
      tags: ['Cooking', 'Hiking'],
      country: 'CA',
      display_availability: true,
    });
    expect(profile.availability_days).not.toBeNull();
    const languages =
      await sql`select language, proficiency_level from profile_target_languages where profile_id = (select id from profiles where user_id = ${owner.id}) order by position`;
    expect(
      languages.map((row) => [row.language, row.proficiency_level]),
    ).toEqual([
      ['en', 'advanced'],
      ['ko', 'beginner'],
    ]);

    await page.reload();
    await main.getByRole('button', { name: 'Edit Bio' }).click();
    await main
      .getByRole('textbox', { name: 'Bio' })
      .fill('This change will be discarded.');
    await main.getByRole('button', { name: 'Discard', exact: true }).click();
    await expect(main.getByRole('button', { name: 'Edit Bio' })).toContainText(
      'Updated from the mobile card editor.',
    );

    await sql`update profiles set last_bumped_at = now() - interval '1 day' where user_id = ${owner.id}`;
    await main.getByRole('button', { name: 'Profile options' }).click();
    await sheet.getByRole('button', { name: 'Bump profile' }).click();
    await expect(
      main.getByText('Your profile is back at the top of Discover.'),
    ).toBeVisible();
    await main.getByRole('button', { name: 'Profile options' }).click();
    await expect(
      sheet.getByRole('button', { name: /^Bump in / }),
    ).toBeDisabled();
    await sheet.getByRole('button', { name: 'View public profile' }).click();
    await expect(page).toHaveURL(/\/en\/u\//);

    await sql`update profiles set is_public = false where user_id = ${owner.id}`;
    await page.goto('/en/profile');
    await main.getByRole('button', { name: 'Profile options' }).click();
    await expect(
      sheet.getByRole('button', { name: 'Delete profile' }),
    ).toBeVisible();
    await expect(sheet.getByRole('button', { name: /^Bump/ })).toHaveCount(0);
  } finally {
    await sql`delete from users where id = ${owner.id}`;
    await sql.end();
  }
});
