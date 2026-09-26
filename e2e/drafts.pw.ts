import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { type BrowserContext, expect, test } from '@playwright/test';
import postgres from 'postgres';

const profile = {
  isPublic: true,
  allowAnonymousCopy: true,
  displayTimezone: true,
  displayAvailability: true,
  primaryLanguage: 'ja',
  targetLanguages: [{ language: 'en', level: 'native-level' }],
  bio: 'A profile for isolated editor recovery checks.',
  tags: ['Cooking'],
  country: 'JP',
  timezone: 'Asia/Tokyo',
};

const signIn = async (context: BrowserContext, id: string) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const [account] =
    await sql`insert into users (discord_user_id, discord_username, display_name, email) values (${id}, 'draft-test', 'Draft test', 'draft@example.com') on conflict (discord_user_id) do update set display_name = excluded.display_name returning id`;
  await sql.end();
  const payload = Buffer.from(
    JSON.stringify({
      user: {
        id,
        accountId: account.id,
        name: 'Draft test',
        username: 'draft-test',
        email: 'draft@example.com',
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
};

test('warns before app navigation when browser draft storage is unavailable', async ({
  page,
  context,
}) => {
  const id = randomUUID().replaceAll('-', '');
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  try {
    await signIn(context, id);
    expect(
      (await context.request.post('/api/profile', { data: profile })).status(),
    ).toBe(200);
    await page.addInitScript(() => {
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (this === sessionStorage)
          throw new DOMException('Storage disabled', 'QuotaExceededError');
        setItem.call(this, key, value);
      };
    });
    await page.goto('/en/profile');
    await page
      .getByLabel('Bio', { exact: true })
      .fill('My draft cannot be stored in this browser.');
    await expect(page.getByRole('status')).toContainText('cannot keep a draft');
    const dialog = page.waitForEvent('dialog');
    const navigation = page
      .getByRole('button', { name: 'Polycord', exact: true })
      .click();
    await (await dialog).dismiss();
    await navigation;
    await expect(page).toHaveURL(/\/en\/profile$/);
    await expect(page.getByLabel('Bio', { exact: true })).toHaveValue(
      'My draft cannot be stored in this browser.',
    );
  } finally {
    await sql`delete from users where discord_user_id = ${id}`;
    await sql.end();
  }
});

test('discarding profile edits does not restore an immediately deleted voice intro', async ({
  page,
  context,
}, testInfo) => {
  const id = randomUUID().replaceAll('-', '');
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  try {
    await signIn(context, id);
    expect(
      (await context.request.post('/api/profile', { data: profile })).status(),
    ).toBe(200);
    const [user] =
      await sql`select id from users where discord_user_id = ${id}`;
    await sql`insert into subscriptions (user_id, stripe_customer_id, status, current_period_end) values (${user.id}, ${id}, 'active', now() + interval '1 day')`;
    const audio = readFileSync('tests/fixtures/voice-short.webm').toString(
      'base64',
    );
    expect(
      (
        await context.request.post('/api/profile/voice', {
          data: {
            audio: `data:audio/webm;base64,${audio}`,
            mimeType: 'audio/webm',
            durationSeconds: 2,
          },
        })
      ).status(),
    ).toBe(200);
    await page.goto('/en/profile');
    await expect(
      page.getByRole('button', { name: 'Save Profile', exact: true }),
    ).toBeDisabled();
    await page
      .getByLabel('Bio', { exact: true })
      .fill('I will discard this bio after deleting the voice intro.');
    await page
      .getByRole('button', { name: 'Remove voice intro', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Remove voice intro', exact: true }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Discard', exact: true }).click();
    await expect(page.getByLabel('Bio', { exact: true })).toHaveValue(
      profile.bio,
    );
    await expect(
      page.getByRole('button', { name: 'Remove voice intro', exact: true }),
    ).toHaveCount(0);
    expect(
      await sql`select id from voice_intros where user_id = ${user.id}`,
    ).toHaveLength(0);
    await page
      .getByText(/Save clip and Remove voice intro apply immediately/)
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath('voice-immediate-actions.png'),
    });
  } finally {
    await sql`delete from users where discord_user_id = ${id}`;
    await sql.end();
  }
});

test('profile drafts recover after navigation and expiry without crossing accounts', async ({
  page,
  context,
}, testInfo) => {
  const ids = [
    randomUUID().replaceAll('-', ''),
    randomUUID().replaceAll('-', ''),
  ];
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  try {
    for (const id of ids) {
      await signIn(context, id);
      expect(
        (
          await context.request.post('/api/profile', { data: profile })
        ).status(),
      ).toBe(200);
    }
    await signIn(context, ids[0]);
    await page.goto('/en/profile');
    const bio = page.getByLabel('Bio', { exact: true });
    await bio.fill('My unfinished draft stays private until I save it.');
    await page
      .getByRole('switch', { name: 'Display timezone', exact: true })
      .click();
    await expect(page.getByLabel('Timezone', { exact: true })).toHaveValue(
      'Asia/Tokyo',
    );
    await page.getByRole('button', { name: 'Polycord', exact: true }).click();
    await expect(page).toHaveURL(/\/en$/);
    const profileItem = page.getByRole('button', {
      name: 'Profile',
      exact: true,
    });
    await expect(async () => {
      await page.getByRole('button', { name: 'Account menu' }).click();
      await expect(profileItem).toBeVisible({ timeout: 2000 });
    }).toPass();
    await profileItem.click();
    await expect(bio).toHaveValue(
      'My unfinished draft stays private until I save it.',
    );
    await expect(page.getByRole('status')).toContainText(
      'draft has been restored',
    );
    await page.screenshot({
      path: testInfo.outputPath('profile-restored-desktop.png'),
      fullPage: true,
    });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/ja/profile');
    await expect(
      page.getByRole('textbox', { name: '自己紹介', exact: true }),
    ).toHaveValue('My unfinished draft stays private until I save it.');
    await page.screenshot({
      path: testInfo.outputPath('profile-restored-mobile-ja.png'),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/en/profile');
    await context.clearCookies();
    const failed = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/profile') &&
        response.request().method() === 'POST',
    );
    await page
      .getByRole('button', { name: 'Save Profile', exact: true })
      .click();
    expect((await failed).status()).toBe(401);
    await expect(
      page.getByRole('link', { name: /session has expired/ }),
    ).toHaveAttribute(
      'href',
      '/api/auth/discord?locale=en&next=%2Fen%2Fprofile',
    );
    await signIn(context, ids[1]);
    await page.reload();
    await expect(bio).toHaveValue(profile.bio);
    await signIn(context, ids[0]);
    await page.reload();
    await expect(bio).toHaveValue(
      'My unfinished draft stays private until I save it.',
    );
    const saved = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/profile') &&
        response.request().method() === 'POST',
    );
    await page
      .getByRole('button', { name: 'Save Profile', exact: true })
      .click();
    expect((await saved).status()).toBe(200);
    await page.reload();
    await expect(page.getByLabel('Timezone', { exact: true })).toHaveValue(
      'Asia/Tokyo',
    );
    await expect(
      page.getByRole('switch', { name: 'Display timezone', exact: true }),
    ).not.toBeChecked();
    await page
      .getByRole('switch', { name: 'Display timezone', exact: true })
      .click();
    await expect(page.getByLabel('Timezone', { exact: true })).toHaveValue(
      'Asia/Tokyo',
    );
    await bio.fill('This edit should be discarded, including after reload.');
    await page.getByRole('button', { name: 'Discard', exact: true }).click();
    await page.reload();
    await expect(bio).toHaveValue(
      'My unfinished draft stays private until I save it.',
    );
    expect(
      await page.evaluate(
        (id) => sessionStorage.getItem(`polycord:profile:${id}`),
        ids[0],
      ),
    ).toBeNull();
  } finally {
    await sql`delete from users where discord_user_id in ${sql(ids)}`;
    await sql.end();
  }
});

test('settings preserve incomplete drafts and clear discarded changes', async ({
  page,
  context,
}, testInfo) => {
  const id = randomUUID().replaceAll('-', '');
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  try {
    await signIn(context, id);
    expect(
      (await context.request.post('/api/profile', { data: profile })).status(),
    ).toBe(200);
    await page.goto('/en/settings');
    await page.getByLabel('Email Address').fill('unfinished');
    await page.getByRole('button', { name: 'Privacy', exact: true }).click();
    await page
      .getByRole('switch', { name: 'Display timezone', exact: true })
      .click();
    await page.reload();
    await page.getByRole('button', { name: 'Account', exact: true }).click();
    await expect(page.getByLabel('Email Address')).toHaveValue('unfinished');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({
      path: testInfo.outputPath('settings-restored-mobile.png'),
      fullPage: true,
    });
    await expect(
      page.getByRole('main').getByRole('button', { name: /^Email Address/ }),
    ).toContainText('unfinished');
    await expect(
      page.getByRole('button', { name: 'Discard', exact: true }),
    ).toHaveCount(0);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole('button', { name: 'Discard', exact: true }).click();
    await page.reload();
    await expect(page.getByLabel('Email Address')).toHaveValue(
      'draft@example.com',
    );
    expect(
      await page.evaluate(
        (userId) => sessionStorage.getItem(`polycord:settings:${userId}`),
        id,
      ),
    ).toBeNull();
    await page
      .getByRole('main')
      .getByRole('button', { name: 'Notifications', exact: true })
      .click();
    await expect(
      page.getByText(/Changes apply immediately, including when you discard/),
    ).toBeVisible();
  } finally {
    await sql`delete from users where discord_user_id = ${id}`;
    await sql.end();
  }
});

test('onboarding scopes incomplete drafts and enforces the same tag caps as editing', async ({
  page,
  context,
}) => {
  const ids = [
    randomUUID().replaceAll('-', ''),
    randomUUID().replaceAll('-', ''),
  ];
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  try {
    await signIn(context, ids[0]);
    await page.goto('/en/onboarding');
    await page.getByLabel('Bio', { exact: true }).fill('short');
    await page.reload();
    await expect(page.getByLabel('Bio', { exact: true })).toHaveValue('short');
    await signIn(context, ids[1]);
    await page.reload();
    await expect(page.getByLabel('Bio', { exact: true })).toHaveValue('');
    await signIn(context, ids[0]);
    await page.reload();
    await expect(page.getByLabel('Bio', { exact: true })).toHaveValue('short');
    await page.getByRole('button', { name: 'Discard', exact: true }).click();
    await page.reload();
    await expect(page.getByLabel('Bio', { exact: true })).toHaveValue('');
    const values = {
      isPublic: true,
      allowAnonymousCopy: true,
      displayTimezone: true,
      displayAvailability: true,
      primaryLanguage: 'ja',
      targetLanguages: [{ language: 'en', level: 'native-level' }],
      timezone: 'Asia/Tokyo',
      availability: { days: 'weekdays', from: '18:00', to: '22:00' },
      bio: profile.bio,
      tags: ['One', 'Two', 'Three', 'Four', 'Five', 'Six'],
    };
    expect(
      (await context.request.post('/api/profile', { data: values })).status(),
    ).toBe(400);
    values.tags.pop();
    expect(
      (await context.request.post('/api/profile', { data: values })).status(),
    ).toBe(200);
    await page.goto('/en/profile');
    await page
      .getByLabel('Bio', { exact: true })
      .fill('I can edit my published onboarding profile.');
    const saved = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/profile') &&
        response.request().method() === 'POST',
    );
    await page
      .getByRole('button', { name: 'Save Profile', exact: true })
      .click();
    expect((await saved).status()).toBe(200);
  } finally {
    await sql`delete from users where discord_user_id in ${sql(ids)}`;
    await sql.end();
  }
});

test('lapsed profiles keep existing languages, tags and styling during unrelated saves', async ({
  context,
}) => {
  const id = randomUUID().replaceAll('-', '');
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  try {
    await signIn(context, id);
    expect(
      (await context.request.post('/api/profile', { data: profile })).status(),
    ).toBe(200);
    const [user] =
      await sql`select id from users where discord_user_id = ${id}`;
    await sql`insert into subscriptions (user_id, stripe_customer_id, status, current_period_end) values (${user.id}, ${id}, 'active', now() + interval '1 day')`;
    const values = {
      ...profile,
      tags: ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'],
      targetLanguages: ['en', 'de', 'fr'].map((language) => ({
        language,
        level: 'beginner',
      })),
      cardColor: 'custom',
      customGradient: { from: '#112233', to: '#445566' },
      accentOverride: '#aabbcc',
    };
    expect(
      (await context.request.post('/api/profile', { data: values })).status(),
    ).toBe(200);
    await sql`update subscriptions set status = 'canceled', current_period_end = now() - interval '1 day' where user_id = ${user.id}`;
    expect(
      (
        await context.request.post('/api/profile', {
          data: {
            ...values,
            bio: 'Only the bio changes after my paid plan expires.',
          },
        })
      ).status(),
    ).toBe(200);
    const [stored] =
      await sql`select tags, card_color, custom_gradient_from, accent_override from profiles where user_id = ${user.id}`;
    expect(stored.tags).toEqual(values.tags);
    expect(stored.card_color).toBe('custom');
    expect(stored.custom_gradient_from).toBe('#112233');
    expect(stored.accent_override).toBe('#aabbcc');
    expect(
      (
        await context.request.post('/api/profile', {
          data: { ...values, tags: [...values.tags.slice(1), 'replacement'] },
        })
      ).status(),
    ).toBe(400);
  } finally {
    await sql`delete from users where discord_user_id = ${id}`;
    await sql.end();
  }
});
