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
    const payload = Buffer.from(
      JSON.stringify({
        user: { id, name: 'Mobile test' },
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
    const sql = postgres(process.env.TEST_DATABASE_URL as string);
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
      for (const name of ['Notifications', 'Change language', 'Card menu']) {
        await page.getByRole('button', { name, exact: true }).first().click();
        const popover = page
          .locator('[data-radix-popper-content-wrapper]')
          .last();
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
