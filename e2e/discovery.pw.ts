import { createHmac, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

test('discovery keeps results through refresh, failure and return navigation', async ({
  page,
}, testInfo) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const owners =
    await sql`insert into users (discord_user_id, discord_username, display_name)
    select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Partner ' || lpad(n::text,2,'0') from generate_series(1,20) n returning id`;
  try {
    await sql`insert into profiles (user_id,is_public,primary_language,target_language,proficiency_level,bio,tags,country,timezone)
      select id,true,'en','ja','intermediate',repeat('A browser navigation fixture. ',6),array[${prefix}],'US','America/Chicago' from users where id in ${sql(owners.map((owner) => owner.id))}`;
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
    await expect(page.getByText('This page could not be found.')).toBeVisible();
  } finally {
    await sql`delete from users where id in ${sql(owners.map((owner) => owner.id))}`;
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
  const cookie = (id: string) => {
    const payload = Buffer.from(
      JSON.stringify({
        user: { id, name: 'Viewer', username: 'Viewer' },
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
      await sql`insert into profiles (user_id,is_public,primary_language,target_language,proficiency_level,bio,tags)
      values (${owners[2].id},true,'en','ja','intermediate','An isolated delivery fixture.',array[${prefix}]) returning id`;
    await sql`insert into saved_profiles (user_id,profile_id) values (${owners[0].id},${profile.id})`;
    const load = (index: number) =>
      request.get(`/api/discovery?tag=${prefix}`, {
        headers: { Cookie: cookie(owners[index].discord_user_id) },
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
    await sql`insert into profiles (user_id,is_public,primary_language,target_language,proficiency_level,bio,tags,country,timezone)
      select id,true,'en','ja','intermediate',repeat('A large discovery fixture. ',10),array[${prefix},'Group ' || (row_number() over () % 100)],'US','America/Chicago' from users where id in ${sql(owners.map((owner) => owner.id))}`;
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
