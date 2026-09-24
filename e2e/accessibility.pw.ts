import { createHmac, randomUUID } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import postgres from 'postgres';

const settle = (page: Page) =>
  page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.effect?.getTiming().iterations !==
            Number.POSITIVE_INFINITY,
        )
        .map((animation) => animation.finished.catch(() => {})),
    ),
  );

test('core pages expose named controls and support keyboard navigation', async ({
  page,
  context,
}) => {
  const id = randomUUID().replaceAll('-', '');
  const accountId = randomUUID();
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  await sql`insert into users (id, discord_user_id, discord_username, display_name) values (${accountId}, ${id}, ${id}, 'Keyboard test')`;
  const payload = Buffer.from(
    JSON.stringify({
      user: {
        id,
        accountId,
        name: 'Keyboard test',
        avatarUrl: '/polycord-logo.svg',
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
  try {
    await page.goto('/en/onboarding');
    await settle(page);
    const onboarding = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(onboarding.violations).toEqual([]);
    const profile = await context.request.post('/api/profile', {
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
    expect(profile.status()).toBe(200);
    const violations = [];
    for (const route of ['/en', '/en/profile', '/en/settings']) {
      await page.goto(route);
      await settle(page);
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      violations.push(
        ...scan.violations.map((v) => ({
          route,
          rule: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
      );
    }
    expect(violations).toEqual([]);
    for (const name of ['Appearance', 'Privacy', 'Notifications', 'Premium']) {
      await page
        .getByRole('main')
        .getByRole('button', { name, exact: true })
        .click();
      await settle(page);
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        scan.violations.map((v) => ({
          rule: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
      ).toEqual([]);
    }
    await page.goto('/en');
    const languageMenu = page.getByRole('button', { name: 'Change language' });
    await languageMenu.click();
    await expect(languageMenu).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(languageMenu).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('button', { name: 'Polycord', exact: true }).focus();
    for (const name of ['Change language', 'Notifications', 'Account menu']) {
      await page.keyboard.press('Tab');
      await expect(
        page.getByRole('button', { name, exact: true }),
      ).toBeFocused();
    }
    for (const name of [
      'Account menu',
      'Change language',
      'Notifications',
      'Card menu',
    ]) {
      const trigger = page.getByRole('button', { name, exact: true }).first();
      await trigger.focus();
      await page.keyboard.press('Enter');
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await settle(page);
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        scan.violations.map((v) => ({
          rule: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
      ).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
    }
    await page.goto('/en/profile');
    const language = page.getByRole('combobox', {
      name: 'Primary Language',
      exact: true,
    });
    await language.focus();
    await page.keyboard.press('ArrowDown');
    await expect(language).toHaveAttribute('aria-expanded', 'true');
    await expect(language).toHaveAttribute('aria-activedescendant', /.+/);
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Tab');
    await expect(language).not.toBeFocused();
    const toggle = page.getByRole('switch', {
      name: 'Make Profile Public',
      exact: true,
    });
    await toggle.focus();
    await page.keyboard.press('Space');
    await expect(toggle).not.toBeChecked();
  } finally {
    await sql`delete from users where discord_user_id = ${id}`;
    await sql.end();
  }
});
