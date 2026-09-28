import { createHmac, randomUUID } from 'node:crypto';
import { type BrowserContext, expect, test } from '@playwright/test';
import postgres from 'postgres';

const signIn = async (
  context: BrowserContext,
  user: { id: string; name: string; username: string },
  accountId: string,
) => {
  const payload = Buffer.from(
    JSON.stringify({
      user: { ...user, accountId },
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

const discordbot = {
  'User-Agent':
    'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
};

test('username links resolve visible profiles and share links prefer them', async ({
  page,
  context,
  request,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const fixtures = [
    ['open', {}],
    ['closed', { allow_anonymous_copy: false }],
    ['private', { is_public: false }],
    ['hidden', { hidden_by_moderation: true }],
    ['banned', {}],
    ['suspended', {}],
    ['reused-old', {}],
    ['reused-new', { is_public: false }],
    ['viewer', {}],
  ] as const;
  const usernames = Object.fromEntries(
    fixtures.map(([key]) => [
      key,
      key.startsWith('reused') ? `reused.${prefix}` : `${key}.${prefix}`,
    ]),
  ) as Record<(typeof fixtures)[number][0], string>;
  const accounts: Record<string, { user: string; profile: string }> = {};
  try {
    for (const [index, [key, overrides]] of fixtures.entries()) {
      const [user] =
        await sql`insert into users (discord_user_id, discord_username, display_name, updated_at, banned_at, suspended_until)
        values (${`${prefix}-${index}`}, ${usernames[key]}, ${`${prefix} Link ${key}`}, now() - make_interval(mins => ${key === 'reused-old' ? 60 : 0}),
          ${key === 'banned' ? new Date() : null}, ${key === 'suspended' ? new Date(Date.now() + 86400000) : null}) returning id`;
      const [profile] = await sql`insert into profiles ${sql({
        user_id: user.id,
        is_public: true,
        allow_anonymous_copy: true,
        hidden_by_moderation: false,
        primary_language: 'en',
        target_language: 'ja',
        proficiency_level: 'beginner',
        bio: 'A username link fixture.',
        tags: [prefix],
        last_bumped_at: new Date(),
        ...overrides,
      })} returning id`;
      accounts[key] = { user: user.id, profile: profile.id };
    }
    const resolve = (
      client: typeof request,
      locale: string,
      username: string,
    ) => client.get(`/${locale}/user/${username}`, { maxRedirects: 0 });

    const open = await resolve(request, 'en', usernames.open.toUpperCase());
    expect(open.status()).toBe(307);
    expect(open.headers().location).toBe(`/en/u/${accounts.open.profile}`);
    expect(
      (await resolve(request, 'ja', usernames.open)).headers().location,
    ).toBe(`/ja/u/${accounts.open.profile}`);
    for (const key of [
      'closed',
      'private',
      'hidden',
      'banned',
      'suspended',
    ] as const) {
      expect((await resolve(request, 'en', usernames[key])).status()).toBe(404);
    }
    expect((await resolve(request, 'en', `missing.${prefix}`)).status()).toBe(
      404,
    );
    expect(
      (await resolve(request, 'en', usernames['reused-new'])).status(),
    ).toBe(404);

    for (const [locale, title] of [
      ['en', `${prefix} Link open on Polycord`],
      ['ja', `${prefix} Link openさんのPolycordプロフィール`],
    ]) {
      const embed = await request.get(`/${locale}/user/${usernames.open}`, {
        headers: discordbot,
      });
      expect(embed.url()).toContain(`/${locale}/u/${accounts.open.profile}`);
      expect(await embed.text()).toContain(
        `<meta property="og:title" content="${title}"/>`,
      );
    }

    await signIn(
      context,
      {
        id: `${prefix}-8`,
        name: `${prefix} Link viewer`,
        username: usernames.viewer,
      },
      accounts.viewer.user,
    );
    const closed = await resolve(context.request, 'en', usernames.closed);
    expect(closed.headers().location).toBe(`/en/u/${accounts.closed.profile}`);
    await page.goto(`/en/user/${usernames.open}`);
    await expect(page).toHaveURL(`/en/u/${accounts.open.profile}`);
    await expect(
      page.getByRole('heading', { name: `${prefix} Link open`, exact: true }),
    ).toBeVisible();

    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`/en?tag=${prefix}`);
    const share = async (key: 'open' | 'closed') => {
      await page
        .locator('article')
        .filter({
          has: page.getByRole('heading', {
            name: `${prefix} Link ${key}`,
            exact: true,
          }),
        })
        .getByRole('button', { name: 'Card menu' })
        .click();
      await page.getByRole('button', { name: 'Share profile' }).click();
    };
    const origin = new URL(page.url()).origin;
    const clipboard = () => page.evaluate(() => navigator.clipboard.readText());
    await share('open');
    await expect.poll(clipboard).toBe(`${origin}/en/user/${usernames.open}`);
    await share('closed');
    await expect
      .poll(clipboard)
      .toBe(`${origin}/en/u/${accounts.closed.profile}`);

    await sql`insert into user_blocks (blocker_user_id, blocked_user_id) values (${accounts.open.user}, ${accounts.viewer.user})`;
    expect(
      (await resolve(context.request, 'en', usernames.open)).status(),
    ).toBe(404);
  } finally {
    await sql`delete from users where discord_user_id like ${`${prefix}-%`}`;
    await sql.end();
  }
});
