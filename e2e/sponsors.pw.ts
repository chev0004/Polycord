import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import postgres from 'postgres';

type Account = { id: string; discordUserId: string };

const BASE_URL = 'http://localhost:3119';
const SPONSOR_URL = 'https://example.com/kumo';
const fixture = (name: string) => `tests/fixtures/${name}.png`;

const signIn = (context: BrowserContext, user: Account) => {
  const payload = Buffer.from(
    JSON.stringify({
      user: {
        id: user.discordUserId,
        accountId: user.id,
        name: user.discordUserId,
        username: user.discordUserId,
      },
      issuedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', 'polycord-isolated-audit-secret')
    .update(payload)
    .digest('base64url');
  return context.addCookies([
    {
      name: 'polycord_session',
      value: `${payload}.${signature}`,
      domain: 'localhost',
      path: '/',
    },
  ]);
};

const localDate = (days: number) => {
  const date = new Date(Date.now() + days * 86_400_000);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const sponsored = (page: Page) => page.locator('a[rel="sponsored noopener"]');

test('owners book sponsors that free visitors see and Supporters never do', async ({
  browser,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const contexts: BrowserContext[] = [];
  const contextFor = async (
    user?: Account,
    viewport = { width: 1440, height: 1000 },
  ) => {
    const context = await browser.newContext({
      baseURL: BASE_URL,
      viewport,
      ...(viewport.width < 768 ? { isMobile: true, hasTouch: true } : {}),
    });
    contexts.push(context);
    await context.route('https://example.com/**', (route) =>
      route.fulfill({ body: 'sponsor' }),
    );
    if (user) await signIn(context, user);
    return context;
  };

  await sql`delete from sponsors`;
  await sql`delete from users where discord_user_id = 'e2e-admin'`;
  const [owner, member, supporter] = await sql<Account[]>`
    insert into users (discord_user_id, discord_username, display_name, premium_granted_until)
    values ('e2e-admin', 'e2e-admin', 'E2E Owner', null),
      (${`${prefix}-member`}, ${`${prefix}-member`}, ${`${prefix} Member`}, null),
      (${`${prefix}-supporter`}, ${`${prefix}-supporter`}, ${`${prefix} Supporter`}, now() + interval '30 days')
    returning id, discord_user_id as "discordUserId"`;
  const people = await sql<Account[]>`
    insert into users (discord_user_id, discord_username, display_name)
    select ${prefix} || '-p' || n, ${prefix} || '-p' || n, ${prefix} || ' Person ' || n
    from generate_series(1, 12) as n
    returning id, discord_user_id as "discordUserId"`;

  try {
    for (const person of people)
      await sql`insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio) values (now(), ${person.id}, true, 'en', 'ja', 'beginner', 'Sponsor placement fixture profile.')`;

    const admin = await (await contextFor(owner)).newPage();
    await admin.goto('/en/admin');
    await admin.getByRole('tab', { name: 'Sponsors' }).click();
    const panel = admin.getByRole('region', { name: 'Sponsors' });
    await expect(panel.getByText('No bookings yet.')).toHaveCount(2);

    const book = async (
      tier: 'Card' | 'Banner',
      images: [string, string][],
    ) => {
      await panel.getByRole('button', { name: tier, exact: true }).click();
      await panel.getByLabel('Sponsor name').fill(`kumo ${tier}`);
      await panel.getByLabel('Link').fill(SPONSOR_URL);
      await panel.getByLabel('Alt text (English)').fill(`kumo ${tier} ad`);
      await panel.getByLabel('Alt text (Japanese)').fill(`kumo ${tier} 広告`);
      await panel.getByLabel('First day').fill(localDate(-1));
      await panel.getByLabel('Last day').fill(localDate(30));
      for (const [label, file] of images)
        await panel.getByLabel(label).setInputFiles(fixture(file));
      await panel.getByRole('button', { name: 'Add sponsor' }).click();
    };

    await book('Banner', [
      ['Banner image (768px and up)', 'sponsor-card'],
      ['Banner image (phones)', 'sponsor-banner-phone'],
    ]);
    await expect(
      panel.getByText(
        'Check the fields and use each image at its exact size and type.',
      ),
    ).toBeVisible();

    await book('Banner', [
      ['Banner image (768px and up)', 'sponsor-banner-wide'],
      ['Banner image (phones)', 'sponsor-banner-phone'],
    ]);
    await expect(panel.getByText('kumo Banner')).toBeVisible();
    await book('Card', [['Card image', 'sponsor-card']]);
    await expect(panel.getByText('kumo Card')).toBeVisible();
    await expect(panel.getByText('Live', { exact: true })).toHaveCount(2);

    const second = await admin.request.post('/api/admin/sponsors', {
      headers: { Origin: BASE_URL },
      multipart: {
        tier: 'banner',
        name: 'Second banner',
        url: SPONSOR_URL,
        altEn: 'Second',
        altJa: 'Second',
        startsAt: new Date(Date.now() + 86_400_000).toISOString(),
        endsAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
        image: {
          name: 'wide.png',
          mimeType: 'image/png',
          buffer: readFileSync(fixture('sponsor-banner-wide')),
        },
        phoneImage: {
          name: 'phone.png',
          mimeType: 'image/png',
          buffer: readFileSync(fixture('sponsor-banner-phone')),
        },
      },
    });
    expect(second.status()).toBe(409);

    const visitor = await (await contextFor()).newPage();
    const hosts = new Set<string>();
    visitor.on('request', (request) => {
      const url = new URL(request.url());
      if (url.protocol.startsWith('http')) hosts.add(url.host);
    });
    await visitor.goto('/en');
    await expect(sponsored(visitor)).toHaveCount(2);
    await expect(visitor.getByText('Sponsored', { exact: true })).toHaveCount(
      2,
    );
    for (const link of await sponsored(visitor).all())
      await expect(link).toHaveAttribute('href', SPONSOR_URL);
    const banner = sponsored(visitor).first().locator('img');
    await expect(banner).toHaveAttribute('alt', 'kumo Banner ad');
    await expect
      .poll(() => banner.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    expect([...hosts]).toEqual(['localhost:3119']);

    await expect
      .poll(
        async () =>
          (await sql`select sum(views)::int as views from sponsors`)[0].views,
      )
      .toBeGreaterThanOrEqual(1);
    const popup = visitor.waitForEvent('popup');
    await sponsored(visitor).first().click();
    await (await popup).close();
    await expect
      .poll(
        async () =>
          (await sql`select clicks from sponsors where name = 'kumo Banner'`)[0]
            .clicks,
      )
      .toBe(1);

    await visitor.getByRole('button', { name: 'Next page' }).click();
    await expect(visitor.getByText('Page 2 of 2')).toBeVisible();
    await expect(sponsored(visitor)).toHaveCount(2);

    const phone = await (
      await contextFor(undefined, { width: 375, height: 812 })
    ).newPage();
    await phone.goto('/ja');
    await expect(phone.getByText('スポンサー', { exact: true })).toHaveCount(2);
    await expect(sponsored(phone).first().locator('img')).toHaveAttribute(
      'alt',
      'kumo Banner 広告',
    );
    await phone.getByRole('button', { name: 'さらにパートナーを表示' }).click();
    await expect(phone.locator('article')).toHaveCount(12);
    await expect(sponsored(phone)).toHaveCount(2);

    const free = await (await contextFor(member)).newPage();
    await free.goto('/en');
    await expect(sponsored(free)).toHaveCount(2);

    const paid = await (await contextFor(supporter)).newPage();
    await paid.goto('/en');
    await expect(paid.locator('article').first()).toBeVisible();
    await expect(sponsored(paid)).toHaveCount(0);

    await panel.getByRole('button', { name: 'Pause' }).last().click();
    await expect(panel.getByText('Paused', { exact: true })).toBeVisible();
    await visitor.goto('/en');
    await expect(visitor.locator('article').first()).toBeVisible();
    await expect(sponsored(visitor)).toHaveCount(1);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    await sql`delete from sponsors`;
    await sql`delete from users where discord_user_id = 'e2e-admin' or discord_user_id like ${`${prefix}-%`}`;
    await sql.end();
  }
});
