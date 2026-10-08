import { createHmac, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

test('a first bump publishes the card at the front in one update', async ({
  page,
  context,
}, testInfo) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const id = randomUUID().replaceAll('-', '');
  const name = `First bump ${id.slice(0, 8)}`;
  const [owner] =
    await sql`insert into users (discord_user_id,discord_username,display_name) values (${id},${name},${name}) returning id`;
  const payload = Buffer.from(
    JSON.stringify({
      user: { id, accountId: owner.id, name, username: name },
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
    const created = await context.request.post('/api/profile', {
      data: {
        isPublic: true,
        allowAnonymousCopy: true,
        displayTimezone: true,
        displayAvailability: true,
        primaryLanguage: 'en',
        targetLanguages: [{ language: 'ja', level: 'beginner' }],
        bio: 'A new profile waiting for its first discovery bump.',
        tags: [],
        timezone: 'UTC',
        availability: null,
      },
    });
    expect(created.status()).toBe(200);
    await page.goto('/en');
    await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(
      0,
    );
    await page.reload();
    await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(
      0,
    );
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page
      .getByRole('button', { name: 'Bump profile', exact: true })
      .click();
    const first = page.locator('article').first();
    await expect(
      first.getByRole('heading', { name, exact: true }),
    ).toBeVisible();
    await expect(first.getByText('just now', { exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('first-bump.png') });
    await page.reload();
    await expect(
      page
        .locator('article')
        .first()
        .getByRole('heading', { name, exact: true }),
    ).toBeVisible();
  } finally {
    await sql`delete from users where id=${owner.id}`;
    await sql.end();
  }
});

test('discovery keeps results through refresh, failure and return navigation', async ({
  page,
}, testInfo) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const owners =
    await sql`insert into users (discord_user_id, discord_username, display_name)
    select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Partner ' || lpad(n::text,2,'0') from generate_series(1,20) n returning id`;
  try {
    await sql`insert into profiles (last_bumped_at,user_id,is_public,primary_language,target_language,proficiency_level,bio,tags,country,timezone)
      select now(),id,true,'en','ja','intermediate',repeat('A browser navigation fixture. ',6),array[${prefix}],'US','America/Chicago' from users where id in ${sql(owners.map((owner) => owner.id))}`;
    await page.goto(`/en?tag=${prefix}&sort=name-asc`);
    await expect(page.getByText('20 partners', { exact: true })).toBeVisible();
    await expect(page.locator('article')).toHaveCount(9);
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator('article')).toHaveCount(9);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/discovery?*', async (route) => {
      await gate;
      await route.continue();
    });
    await page
      .getByRole('textbox', { name: 'Search profiles' })
      .fill('Partner 20');
    await expect(page.getByText(/Searching/)).toBeVisible();
    await expect(page.locator('article')).toHaveCount(9);
    await expect(page.getByLabel('Loading profiles')).toHaveCount(0);
    release();
    await expect(page.getByText('1 partner', { exact: true })).toBeVisible();
    await expect(page.locator('article')).toHaveCount(1);
    await page.unroute('**/api/discovery?*');
    await page.route('**/api/discovery?*', (route) =>
      route.fulfill({ status: 503, body: '{}' }),
    );
    await page
      .getByRole('textbox', { name: 'Search profiles' })
      .fill('Partner');
    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      "We couldn't load profiles",
    );
    await expect(page.locator('article')).toHaveCount(1);
    await page.screenshot({
      path: testInfo.outputPath('refresh-error.png'),
      fullPage: true,
    });
    await page.unroute('**/api/discovery?*');
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(page.getByText('20 partners', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next page', exact: true }).click();
    await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: `${prefix} Partner 10`, exact: true }),
    ).toBeVisible();
    const resultUrl = page.url();
    const card = page.locator('article').last();
    const name = await card.locator('h3').innerText();
    await card.getByRole('button', { name: 'Card menu', exact: true }).click();
    await page
      .getByRole('button', { name: 'View profile', exact: true })
      .click();
    await expect(page).toHaveURL(/\/u\/.*from=/);
    await expect(
      page.getByRole('heading', { name, exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Back to discovery', exact: true })
      .click();
    await expect(page).toHaveURL(resultUrl);
    await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();
    await expect(page.getByText('20 partners', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
    await expect(
      page.locator('[aria-hidden="true"].pointer-events-none.fixed'),
    ).toHaveCSS('opacity', '0');
    await page.screenshot({
      path: testInfo.outputPath('discovery-return.png'),
      fullPage: true,
    });
    await page.goBack();
    await expect(
      page.getByRole('heading', { name, exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(resultUrl);
    await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();
    await sql`update profiles set is_public=false where user_id in ${sql(owners.map((owner) => owner.id))}`;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page.getByText('0 partners', { exact: true })).toBeVisible();
    await expect(page.locator('article')).toHaveCount(0);
    await page.goForward();
    await expect(
      page.getByRole('heading', { name: 'This profile is not available' }),
    ).toBeVisible();
  } finally {
    await sql`delete from users where id in ${sql(owners.map((owner) => owner.id))}`;
    await sql.end();
  }
});

test('desktop pages load behind the progress bar and open at the top', async ({
  page,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const owners =
    await sql`insert into users (discord_user_id, discord_username, display_name)
    select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Page ' || lpad(n::text,2,'0') from generate_series(1,20) n returning id`;
  try {
    await sql`insert into profiles (last_bumped_at,user_id,is_public,primary_language,target_language,proficiency_level,bio,tags,country)
      select now(),id,true,'en','ja','intermediate','A pagination fixture.',array[${prefix}],'US' from users where id in ${sql(owners.map((owner) => owner.id))}`;
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/en?q=Page&tag=${prefix}&country=US&sort=name-desc`);
    await expect(page.getByText('20 partners', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: `${prefix} Page 20`, exact: true }),
    ).toBeVisible();
    const bar = page.locator('div.fixed.top-0.h-1');
    const next = page.getByRole('button', { name: 'Next page', exact: true });
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/discovery?*', async (route) => {
      await gate;
      await route.continue();
    });
    await next.scrollIntoViewIfNeeded();
    const scrolled = await page.evaluate(() => window.scrollY);
    expect(scrolled).toBeGreaterThan(300);

    await next.click();
    await expect(bar).toHaveClass(/opacity-100/);
    await expect(page.getByText('20 partners', { exact: true })).toBeVisible();
    await expect(page.getByText(/Searching/)).toHaveCount(0);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrolled);
    release();
    await expect(
      page.getByRole('heading', { name: `${prefix} Page 11`, exact: true }),
    ).toBeAttached();
    await expect(bar).toHaveClass(/opacity-0/);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(
      page.getByRole('textbox', { name: 'Search profiles' }),
    ).toBeInViewport();
    await expect(
      page.getByRole('button', { name: 'Primary Language', exact: true }),
    ).toBeInViewport();
    expect(Object.fromEntries(new URL(page.url()).searchParams)).toMatchObject({
      q: 'Page',
      tag: prefix,
      country: 'US',
      sort: 'name-desc',
      page: '2',
    });

    await page.unroute('**/api/discovery?*');
    await page.route('**/api/discovery?*', (route) =>
      route.fulfill({ status: 503, body: '{}' }),
    );
    await next.click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      "We couldn't load profiles",
    );
    await expect(bar).toHaveClass(/opacity-0/);

    await page.unroute('**/api/discovery?*');
    await page.goto(`/en?q=Page&tag=${prefix}&country=US&sort=name-desc`);
    await expect(page.getByText('20 partners', { exact: true })).toBeVisible();
    await page.route('**/api/discovery?*', (route) =>
      route.fulfill({ status: 503, body: '{}' }),
    );
    await next.click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      "We couldn't load profiles",
    );
    await page.unroute('**/api/discovery?*');
    let releaseRetry: () => void = () => {};
    const retryGate = new Promise<void>((resolve) => {
      releaseRetry = resolve;
    });
    await page.route('**/api/discovery?*', async (route) => {
      await retryGate;
      await route.continue();
    });
    await next.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300);

    await next.click();
    await expect(bar).toHaveClass(/opacity-100/);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
    releaseRetry();
    await expect(
      page.getByRole('heading', { name: `${prefix} Page 02`, exact: true }),
    ).toBeAttached();
    await expect(bar).toHaveClass(/opacity-0/);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  } finally {
    await sql`delete from users where id in ${sql(owners.map((owner) => owner.id))}`;
    await sql.end();
  }
});

const languageFixture = async (sql: postgres.Sql) => {
  const prefix = randomUUID().slice(0, 8);
  const owners =
    await sql`insert into users (discord_user_id, discord_username, display_name)
    select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Filter ' || lpad(n::text,2,'0') from generate_series(1,20) n returning id`;
  await sql`insert into profiles (last_bumped_at,user_id,is_public,primary_language,target_language,proficiency_level,bio,tags,country)
    select now(),users.id,true,case when right(users.display_name,2)::int % 2 = 0 then 'en' else 'fr' end,'ja','intermediate','A filter fixture.',array[${prefix}],'US'
    from users where users.id in ${sql(owners.map((owner) => owner.id))}`;
  return {
    prefix,
    cleanup: () =>
      sql`delete from users where id in ${sql(owners.map((owner) => owner.id))}`,
  };
};

const centerInView = (target: import('@playwright/test').Locator) =>
  target.evaluate((element) => element.scrollIntoView({ block: 'center' }));

const gateDiscovery = async (page: import('@playwright/test').Page) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/discovery?*', async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  return async () => {
    release();
    await page.unroute('**/api/discovery?*');
  };
};

const recordScrolls = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const scrolls: number[] = [];
    (window as unknown as { scrolls: number[] }).scrolls = scrolls;
    window.addEventListener('scroll', () => scrolls.push(window.scrollY));
  });

const recordedScrolls = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { scrolls: number[] }).scrolls);

test('desktop filter changes load behind the progress bar and open at the top', async ({
  page,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const fixture = await languageFixture(sql);
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/en?tag=${fixture.prefix}&sort=name-desc`);
    await expect(page.getByText('20 partners', { exact: true })).toBeVisible();
    const bar = page.locator('div.fixed.top-0.h-1');
    const french = page.getByRole('button', { name: 'French', exact: true });
    await centerInView(french.last());
    const scrolled = await page.evaluate(() => window.scrollY);
    expect(scrolled).toBeGreaterThan(300);
    await recordScrolls(page);

    let release = await gateDiscovery(page);
    await french.last().click();
    await expect(bar).toHaveClass(/opacity-100/);
    await expect(page.getByText('20 partners', { exact: true })).toBeVisible();
    await expect(page.getByText(/Searching/)).toHaveCount(0);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrolled);
    expect((await recordedScrolls(page)).every((y) => y === scrolled)).toBe(
      true,
    );
    await release();
    await expect(page.getByText('10 partners', { exact: true })).toBeVisible();
    await expect(bar).toHaveClass(/opacity-0/);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(
      new Set((await recordedScrolls(page)).filter((y) => y !== scrolled)),
    ).toEqual(new Set([0]));
    await expect(
      page.getByRole('textbox', { name: 'Search profiles' }),
    ).toBeInViewport();
    expect(Object.fromEntries(new URL(page.url()).searchParams)).toMatchObject({
      tag: fixture.prefix,
      sort: 'name-desc',
      primary: 'fr',
    });

    await page.goto(`/en?tag=${fixture.prefix}&sort=name-desc`);
    await expect(page.getByText('20 partners', { exact: true })).toBeVisible();
    release = await gateDiscovery(page);
    await french.last().click();
    await page
      .getByRole('button', { name: 'English', exact: true })
      .last()
      .click();
    await release();
    await expect(bar).toHaveClass(/opacity-0/);
    await expect(page.getByText('20 partners', { exact: true })).toBeVisible();
    expect(new URL(page.url()).searchParams.getAll('primary').sort()).toEqual([
      'en',
      'fr',
    ]);
  } finally {
    await fixture.cleanup();
    await sql.end();
  }
});

test('phone filter changes use the progress bar and load more keeps the position', async ({
  page,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const fixture = await languageFixture(sql);
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/en?tag=${fixture.prefix}&sort=name-desc`);
    await expect(page.getByText('20 partners', { exact: true })).toBeVisible();
    const bar = page.locator('div.fixed.top-0.h-1');
    const french = page.getByRole('button', { name: 'French', exact: true });
    await centerInView(french.last());
    const scrolled = await page.evaluate(() => window.scrollY);
    expect(scrolled).toBeGreaterThan(300);

    const anchor = await page.evaluateHandle(
      () =>
        [...document.querySelectorAll('article')].find(
          (card) => card.getBoundingClientRect().bottom > 100,
        ) as Element,
    );
    const anchorTop = () =>
      anchor.evaluate((card) => Math.round(card.getBoundingClientRect().top));
    const before = await anchorTop();
    let release = await gateDiscovery(page);
    await french.last().click();
    await expect(bar).toHaveClass(/opacity-100/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.waitForTimeout(500);
    expect(Math.abs((await anchorTop()) - before)).toBeLessThanOrEqual(2);
    await release();
    await expect(page.getByText('10 partners', { exact: true })).toBeVisible();
    await expect(bar).toHaveClass(/opacity-0/);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    const more = page.getByRole('button', { name: 'Show more partners' });
    await centerInView(more);
    const loadedCards = await page.locator('article').count();
    const beforeMore = await page.evaluate(() => window.scrollY);
    release = await gateDiscovery(page);
    await more.click();
    await page.waitForTimeout(500);
    await expect(bar).toHaveClass(/opacity-0/);
    await expect(page.locator('article')).toHaveCount(loadedCards);
    await release();
    await expect(page.locator('article')).toHaveCount(10);
    expect(await page.locator('article').count()).toBeGreaterThan(loadedCards);
    expect(await page.evaluate(() => window.scrollY)).toBe(beforeMore);
  } finally {
    await fixture.cleanup();
    await sql.end();
  }
});

test('discovery responses stay private and slow delivery does not hold a profile page', async ({
  request,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const owners =
    await sql`insert into users (discord_user_id, discord_username, display_name)
    select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Viewer ' || n from generate_series(1,3) n returning id, discord_user_id`;
  const cookie = (id: string, accountId: string) => {
    const payload = Buffer.from(
      JSON.stringify({
        user: {
          id,
          accountId,
          name: 'Viewer',
          username: 'Viewer',
        },
        expiresAt: Date.now() + 3600000,
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', 'polycord-isolated-audit-secret')
      .update(payload)
      .digest('base64url');
    return `polycord_session=${payload}.${signature}`;
  };
  try {
    const [profile] =
      await sql`insert into profiles (last_bumped_at,user_id,is_public,primary_language,target_language,proficiency_level,bio,tags)
      values (now(),${owners[2].id},true,'en','ja','intermediate','An isolated delivery fixture.',array[${prefix}]) returning id`;
    await sql`insert into saved_profiles (user_id,profile_id) values (${owners[0].id},${profile.id})`;
    await sql`insert into user_settings (user_id,profile_view_alert) values (${owners[2].id},true)`;
    const load = (index: number) =>
      request.get(`/api/discovery?tag=${prefix}`, {
        headers: {
          Cookie: cookie(owners[index].discord_user_id, owners[index].id),
        },
      });
    const first = await load(0);
    expect(first.headers()['cache-control']).toBe('private, no-store');
    expect((await first.json()).savedProfileIds).toEqual([profile.id]);
    expect((await (await load(1)).json()).savedProfileIds).toEqual([]);
    await sql`insert into user_blocks (blocker_user_id, blocked_user_id) values (${owners[2].id},${owners[0].id})`;
    expect((await (await load(0)).json()).profiles).toHaveLength(0);
    expect((await (await load(1)).json()).profiles).toHaveLength(1);
    let unlock: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    let ready: () => void = () => {};
    const locked = new Promise<void>((resolve) => {
      ready = resolve;
    });
    const transaction = sql.begin(async (tx) => {
      await tx`lock table notifications in access exclusive mode`;
      ready();
      await gate;
    });
    await locked;
    try {
      const response = await request.get(`/en/u/${profile.id}`, {
        timeout: 3000,
      });
      expect(response.ok()).toBe(true);
      expect(await response.text()).toContain(`${prefix} Viewer 3`);
    } finally {
      unlock();
      await transaction;
    }
    await expect
      .poll(
        async () =>
          (
            await sql`select id from notifications where user_id=${owners[2].id}`
          ).length,
      )
      .toBe(1);
    await sql`update profiles set is_public=false where id=${profile.id}`;
    expect((await (await load(1)).json()).profiles).toHaveLength(0);
  } finally {
    await sql`delete from users where id in ${sql(owners.map((owner) => owner.id))}`;
    await sql.end();
  }
});

test('query-only navigation finishes with the response and ignores repeat clicks', async ({
  page,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const name = `Navigation ${randomUUID()}`;
  const [owner] =
    await sql`insert into users (discord_user_id, discord_username, display_name) values (${randomUUID().slice(0, 32)},${name},${name}) returning id`;
  try {
    await sql`insert into profiles (user_id,is_public,primary_language,target_language,proficiency_level,bio,last_bumped_at)
    values (${owner.id},true,'en','ja','intermediate','An isolated navigation fixture.',now())`;
    await page.goto(`/en?q=${encodeURIComponent(`${name}-missing`)}`);
    await expect(page.getByText('0 partners', { exact: true })).toBeVisible();
    const progress = page.locator(
      '[aria-hidden="true"].pointer-events-none.fixed',
    );
    const home = page.getByRole('link', { name: 'Discovery', exact: true });
    await home.scrollIntoViewIfNeeded();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/en?*_rsc=*', async (route) => {
      await gate;
      await route.continue();
    });
    await home.click();
    await expect(progress).toHaveCSS('opacity', '1');
    release();
    await expect(page).toHaveURL(/\/en$/);
    await expect(
      page.getByRole('textbox', { name: 'Search profiles' }),
    ).toHaveValue('');
    await expect(
      page.getByRole('heading', { name, exact: true }),
    ).toBeVisible();
    await expect(progress).toHaveCSS('opacity', '0', { timeout: 2000 });
    await page.unroute('**/en?*_rsc=*');
    await home.click();
    await expect(progress).toHaveCSS('opacity', '0');
  } finally {
    await sql`delete from users where id=${owner.id}`;
    await sql.end();
  }
});

test('ten thousand profiles keep page and facet responses bounded', async ({
  request,
}, testInfo) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const owners =
    await sql`insert into users (discord_user_id, discord_username, display_name)
    select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Partner ' || n from generate_series(1,10000) n returning id`;
  try {
    await sql`insert into profiles (last_bumped_at,user_id,is_public,primary_language,target_language,proficiency_level,bio,tags,country,timezone)
      select now(),id,true,'en','ja','intermediate',repeat('A large discovery fixture. ',10),array[${prefix},'Group ' || (row_number() over () % 100)],'US','America/Chicago' from users where id in ${sql(owners.map((owner) => owner.id))}`;
    await sql`analyze profiles, users`;
    const measurements = [];
    for (const query of [
      '',
      '&page=1000',
      '&q=Japanese',
      '&primary=en&target=ja&country=US',
    ]) {
      const start = Date.now();
      const response = await request.get(
        `/api/discovery?tag=${prefix}${query}`,
      );
      expect(response.ok()).toBe(true);
      const body = await response.body();
      const data = JSON.parse(body.toString());
      measurements.push({
        query,
        readyMs: Date.now() - start,
        responseBytes: body.length,
        profiles: data.profiles.length,
        tags: data.tags.length,
      });
      expect(data.total).toBe(10000);
      expect(data.profiles).toHaveLength(9);
      expect(data.tags.length).toBeLessThanOrEqual(32);
      expect(body.length).toBeLessThan(16000);
    }
    const stacked = await request.get(
      `/api/discovery?tag=${prefix}&stack=1&page=100000`,
    );
    expect(stacked.ok()).toBe(true);
    const stackedData = await stacked.json();
    expect(stackedData.page).toBe(20);
    expect(stackedData.profiles).toHaveLength(180);
    const resultsPath = testInfo.outputPath('large-fixture-results.json');
    await writeFile(resultsPath, JSON.stringify(measurements, null, 2));
    await testInfo.attach('large-fixture-results', {
      path: resultsPath,
      contentType: 'application/json',
    });
  } finally {
    await sql`delete from users where id in ${sql(owners.map((owner) => owner.id))}`;
    await sql.end();
  }
});
