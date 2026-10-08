import { createHmac, randomUUID } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';
import { discoveryBootstrapScript } from '../src/lib/discoveryBootstrapScript';
import en from '../src/locales/en.json';
import ja from '../src/locales/ja.json';

const sql = postgres(process.env.TEST_DATABASE_URL as string);
const prefix = `Shell ${randomUUID().slice(0, 8)}`;
let owners: { id: string; discord_user_id: string; display_name: string }[];

test.beforeAll(async () => {
  owners =
    await sql`insert into users (discord_user_id,discord_username,display_name)
    values (${randomUUID().replaceAll('-', '')},${`${prefix} Alice`},${`${prefix} Alice`}),
    (${randomUUID().replaceAll('-', '')},${`${prefix} Bob`},${`${prefix} Bob`}),
    (${randomUUID().replaceAll('-', '')},${`${prefix} Viewer`},${`${prefix} Viewer`})
    returning id,discord_user_id,display_name`;
  for (const owner of owners.slice(0, 2))
    await sql`insert into profiles (user_id,is_public,primary_language,target_language,proficiency_level,bio,tags,country,last_bumped_at)
      values (${owner.id},true,'en','ja','intermediate','An isolated shell fixture.',array[${prefix}],'US',now())`;
});

test.afterAll(async () => {
  await sql`delete from users where id in ${sql(owners.map(({ id }) => id))}`;
  await sql.end();
});

for (const locale of ['en', 'ja'] as const)
  for (const width of [1440, 390])
    test(`${locale} shell stays usable while data and account load at ${width}px`, async ({
      page,
    }, testInfo) => {
      const messages = locale === 'en' ? en : ja;
      const t = messages.Discovery;
      await page.setViewportSize({ width, height: 900 });
      let releaseData: () => void = () => {};
      const dataGate = new Promise<void>((resolve) => {
        releaseData = resolve;
      });
      const calls: string[] = [];
      await page.route('**/api/discovery/bootstrap?*', async (route) => {
        const url = new URL(route.request().url());
        if (url.searchParams.get('count') !== '1') calls.push(url.search);
        if (
          url.searchParams.get('q') === owners[0].display_name &&
          url.searchParams.get('count') !== '1'
        ) {
          const response = await route.fetch();
          await dataGate;
          await route.fulfill({ response });
        } else await route.continue();
      });
      try {
        const response = await page.goto(
          `/${locale}?q=${encodeURIComponent(owners[0].display_name)}&country=US&sort=name-asc`,
        );
        expect(await response?.text()).toContain('polycord-wordmark.svg');
        expect(await response?.text()).toContain(
          `aria-label="${t.searchLabel}"`,
        );
        const search = page.getByRole('textbox', { name: t.searchLabel });
        await expect(search).toHaveValue(owners[0].display_name);
        await expect(
          page.getByRole('button', {
            name: messages.LanguageSwitcher.changeLanguage,
          }),
        ).toBeVisible();
        await expect(
          page.getByRole('status', { name: t.viewerLoading }),
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: messages.loginWithDiscord }),
        ).toHaveCount(0);
        await expect.poll(() => calls.length).toBe(1);
        expect(calls[0]).toContain('country=US');
        expect(calls[0]).toContain('sort=name-asc');
        if (width > 768) {
          await page
            .getByRole('button', { name: t.filterPrimaryLanguage, exact: true })
            .click();
          await expect(page.locator('.PopoverContent')).toBeVisible();
        } else {
          await page
            .getByRole('button', { name: new RegExp(`^${t.filterSheetTitle}`) })
            .click();
          await expect(page.getByRole('dialog')).toBeVisible();
        }
        await page.keyboard.press('Escape');
        await page
          .getByRole('button', {
            name: width > 768 ? t.sortLabel : new RegExp(`^${t.sortByLabel}:`),
            exact: width > 768,
          })
          .click();
        await expect(
          page.getByText(t.sortNameDesc, { exact: true }),
        ).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(
          page.getByRole('button', {
            name: width > 768 ? t.sortLabel : new RegExp(`^${t.sortByLabel}:`),
            exact: width > 768,
          }),
        ).toBeFocused();
        await search.fill(owners[1].display_name);
        await expect
          .poll(() =>
            calls.some(
              (query) =>
                new URLSearchParams(query).get('q') === owners[1].display_name,
            ),
          )
          .toBe(true);
        await expect(search).toBeFocused();
        await page.screenshot({
          path: testInfo.outputPath('pending-shell.png'),
          animations: 'disabled',
        });
        await expect(
          page.getByRole('heading', {
            name: new RegExp(owners[1].display_name),
          }),
        ).toBeVisible();
        await expect(search).toHaveValue(owners[1].display_name);
        await expect(search).toBeFocused();
        releaseData();
        await expect(
          page.getByRole('heading', {
            name: new RegExp(owners[0].display_name),
          }),
        ).toHaveCount(0);
        await expect(
          page.getByRole('heading', {
            name: new RegExp(owners[1].display_name),
          }),
        ).toBeVisible();
        await page.evaluate(() =>
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
        const accessibility = await new AxeBuilder({ page }).analyze();
        expect(accessibility.violations).toEqual([]);
        await page.screenshot({
          path: testInfo.outputPath('ready-shell.png'),
          animations: 'disabled',
        });
      } finally {
        releaseData();
        await page.unrouteAll({ behavior: 'wait' });
      }
    });

for (const width of [1440, 390])
  test(`a signed-in account resolves without moving pending search at ${width}px`, async ({
    page,
    context,
  }) => {
    const owner = owners[2];
    await page.setViewportSize({ width, height: 900 });
    const payload = Buffer.from(
      JSON.stringify({
        user: {
          id: owner.discord_user_id,
          accountId: owner.id,
          name: owner.display_name,
          username: owner.display_name,
        },
        issuedAt: Date.now(),
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
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/discovery/bootstrap?*', async (route) => {
      await gate;
      await route.continue();
    });
    try {
      await page.goto('/en');
      const search = page.getByRole('textbox', {
        name: en.Discovery.searchLabel,
      });
      await search.fill(owners[1].display_name);
      const bounds = await search.boundingBox();
      await expect(
        page.getByRole('button', { name: en.loginWithDiscord }),
      ).toHaveCount(0);
      release();
      await expect(
        width > 768
          ? page.getByRole('button', { name: 'Account menu' })
          : page.getByRole('navigation', { name: 'Main', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { name: new RegExp(owners[1].display_name) }),
      ).toBeVisible();
      await expect(search).toHaveValue(owners[1].display_name);
      await expect(search).toBeFocused();
      expect((await search.boundingBox())?.y).toBe(bounds?.y);
      await expect(
        page.getByRole('button', {
          name: en.Discovery.onboardingPromptDismiss,
        }),
      ).toBeVisible();
    } finally {
      release();
      await page.unrouteAll({ behavior: 'wait' });
    }
  });

test('query history, refresh and failed-data retry preserve the shell', async ({
  page,
}) => {
  await page.goto(`/en?q=${encodeURIComponent(owners[0].display_name)}`);
  const search = page.getByRole('textbox', { name: en.Discovery.searchLabel });
  await expect(
    page.getByRole('heading', { name: new RegExp(owners[0].display_name) }),
  ).toBeVisible();
  await page.evaluate(
    (name) =>
      window.history.pushState(null, '', `/en?q=${encodeURIComponent(name)}`),
    owners[1].display_name,
  );
  await expect(search).toHaveValue(owners[1].display_name);
  await expect(
    page.getByRole('heading', { name: new RegExp(owners[1].display_name) }),
  ).toBeVisible();
  await page.goBack();
  await expect(search).toHaveValue(owners[0].display_name);
  await expect(
    page.getByRole('heading', { name: new RegExp(owners[0].display_name) }),
  ).toBeVisible();
  await page.goForward();
  await expect(search).toHaveValue(owners[1].display_name);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: new RegExp(owners[1].display_name) }),
  ).toBeVisible();
  await page.route('**/api/discovery?*', (route) =>
    route.fulfill({ status: 503, body: '{}' }),
  );
  await search.fill(`${prefix} unavailable`);
  await expect(
    page.getByRole('alert').filter({ hasText: en.Discovery.feedErrorTitle }),
  ).toContainText(en.Discovery.feedErrorTitle);
  await expect(search).toBeEnabled();
  await page.unroute('**/api/discovery?*');
  await search.fill(owners[0].display_name);
  await page.getByRole('button', { name: en.Discovery.retryFeed }).click();
  await expect(
    page.getByRole('heading', { name: new RegExp(owners[0].display_name) }),
  ).toBeVisible();
  await expect(search).toHaveValue(owners[0].display_name);
});

test('restoring pending search text restarts the cancelled request', async ({
  page,
}) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  await page.route('**/api/discovery/bootstrap?*', async (route) => {
    calls++;
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
  });
  try {
    await page.goto(`/en?q=${encodeURIComponent(owners[0].display_name)}`);
    await expect.poll(() => calls).toBe(1);
    const search = page.getByRole('textbox', {
      name: en.Discovery.searchLabel,
    });
    await search.fill(`${owners[0].display_name}x`);
    await search.fill(owners[0].display_name);
    await expect.poll(() => calls).toBe(2);
    release();
    await expect(
      page.getByRole('heading', { name: new RegExp(owners[0].display_name) }),
    ).toBeVisible();
    await expect(
      page.getByRole('status', { name: en.Discovery.feedLoadingLabel }),
    ).toHaveCount(0);
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

for (const width of [1440, 390])
  test(`return scroll waits for the rendered grid at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() =>
      sessionStorage.setItem(
        'polycord:discovery-return',
        JSON.stringify({ href: '/en', scrollY: 2000 }),
      ),
    );
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/discovery/bootstrap?*', async (route) => {
      await gate;
      await route.fulfill({
        json: {
          viewer: { isLoggedIn: false },
          data: {
            profiles: Array.from({ length: 21 }, (_, index) => ({
              id: `return-${index}`,
              displayName: `Return fixture ${index}`,
              primaryLanguage: 'en',
              targetLanguages: [{ language: 'ja', level: 'intermediate' }],
              about: 'An isolated scroll restoration fixture. '.repeat(15),
              tags: [],
            })),
            total: 21,
            page: 1,
            groupSizes: [21],
            tags: [],
            savedProfileIds: [],
          },
        },
      });
    });
    try {
      await page.goto('/en');
      await expect(
        page.getByRole('status', { name: en.Discovery.feedLoadingLabel }),
      ).toBeVisible();
      expect(
        await page.evaluate(() =>
          sessionStorage.getItem('polycord:discovery-return'),
        ),
      ).not.toBeNull();
      release();
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(2000);
      expect(
        await page.evaluate(() =>
          sessionStorage.getItem('polycord:discovery-return'),
        ),
      ).toBeNull();
      await expect(
        page.getByRole('heading', { name: /Return fixture/ }).first(),
      ).toBeVisible();
    } finally {
      release();
      await page.unrouteAll({ behavior: 'wait' });
    }
  });

test('saved viewer availability enables overlap filtering and sorting', async ({
  page,
  context,
}) => {
  const owner = owners[2];
  await sql`insert into profiles (user_id,is_public,primary_language,target_language,proficiency_level,bio,timezone,availability_days,availability_from,availability_to)
    values (${owner.id},false,'en','ja','intermediate','A viewer availability fixture.','America/Chicago','weekdays','18:00','22:00')`;
  const payload = Buffer.from(
    JSON.stringify({
      user: {
        id: owner.discord_user_id,
        accountId: owner.id,
        name: owner.display_name,
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
  const response = await context.request.get(
    '/api/discovery/bootstrap?&locale=en',
  );
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('private, no-store');
  expect((await response.json()).viewer).toMatchObject({
    viewerTimezone: 'America/Chicago',
    viewerAvailability: { days: 'weekdays', from: '18:00', to: '22:00' },
  });
  await page.goto('/en');
  await expect(
    page.getByRole('button', { name: 'Account menu' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: en.Discovery.filterAvailability, exact: true })
    .click();
  await expect(
    page.getByText(en.Discovery.filterOverlapsWithMe, { exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: en.Discovery.sortLabel, exact: true })
    .click();
  await expect(
    page.getByText(en.Discovery.sortMostOverlap, { exact: true }),
  ).toBeVisible();
});

test('the served document starts the bootstrap request and the page reuses it', async ({
  page,
}) => {
  await page.route('**/en', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        '</head>',
        `${discoveryBootstrapScript}</head>`,
      ),
    });
  });
  const paths: string[] = [];
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (pathname.startsWith('/api/discovery')) paths.push(pathname);
  });
  await page.goto('/en');
  await expect(
    page.getByRole('heading', { name: new RegExp(prefix) }).first(),
  ).toBeVisible();
  expect(paths).toEqual(['/api/discovery/bootstrap']);
  expect(await page.evaluate(() => window.__polycordBootstrap)).toBeUndefined();
});
