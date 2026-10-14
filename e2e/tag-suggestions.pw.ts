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

test('profile tags suggest existing tags and create new ones explicitly', async ({
  page,
  context,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 6);
  const identities = ['Editor', 'Lister', 'Blocked'].map((name) => ({
    id: randomUUID().replaceAll('-', ''),
    name: `Tags ${name} ${prefix}`,
    username: `tags.${name.toLowerCase()}.${prefix}`,
  }));
  const rugby = `${prefix}Rugby`;
  const running = `${prefix}Running`;
  const hidden = `${prefix}Hidden`;
  const accounts: string[] = [];
  try {
    for (const user of identities) {
      const [account] =
        await sql`insert into users (discord_user_id, discord_username, display_name) values (${user.id}, ${user.username}, ${user.name}) returning id`;
      accounts.push(account.id);
    }
    const [editor, lister, blocked] = accounts;
    const insertProfile = (account: string, tags: string[]) =>
      sql`insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio, tags, country, timezone) values (now(), ${account}, true, 'en', 'ja', 'beginner', 'A language partner profile for tag tests.', ${sql.array(tags)}, 'JP', 'Asia/Tokyo')`;
    await insertProfile(editor, ['Anime']);
    await insertProfile(lister, [rugby, running]);
    await insertProfile(blocked, [rugby, hidden]);
    await sql`insert into user_blocks (blocker_user_id, blocked_user_id) values (${editor}, ${blocked})`;

    expect((await context.request.get('/api/tags')).status()).toBe(401);

    await signIn(context, identities[0], editor);
    const suggest = async (query: string, exclude: string[] = []) => {
      const params = new URLSearchParams({ q: query });
      for (const tag of exclude) params.append('exclude', tag);
      const response = await context.request.get(`/api/tags?${params}`);
      expect(response.status()).toBe(200);
      return (await response.json()).tags as { tag: string; count: number }[];
    };

    expect((await suggest('')).length).toBeLessThanOrEqual(5);
    expect(await suggest(prefix.toUpperCase())).toEqual([
      { tag: rugby, count: 1 },
      { tag: running, count: 1 },
    ]);
    expect(await suggest(prefix, [rugby.toLowerCase()])).toEqual([
      { tag: running, count: 1 },
    ]);
    expect(await suggest(hidden)).toEqual([]);

    await page.goto('/en/profile');
    const input = page.getByPlaceholder('Type a tag and press Enter');
    const searches: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname === '/api/tags') searches.push(url.search);
    });
    await input.click();
    await expect(page.getByRole('listbox')).toBeVisible();
    const popularRequests = searches.length;
    await page.keyboard.press('Escape');
    await input.click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.waitForTimeout(300);
    expect(searches.length).toBe(popularRequests);

    const query = rugby.slice(0, -2).toLowerCase();
    await input.fill(query);
    await expect(
      page.getByRole('option', { name: new RegExp(`^${rugby}`) }),
    ).toBeVisible();
    const searchedRequests = searches.length;
    await input.fill(query.toUpperCase());
    await page.keyboard.press('Escape');
    await input.click();
    await expect(
      page.getByRole('option', { name: new RegExp(`^${rugby}`) }),
    ).toBeVisible();
    await page.waitForTimeout(300);
    expect(searches.length).toBe(searchedRequests);
    await input.fill(`${query}x`);
    await input.fill(`${query}xy`);
    await input.fill(query);
    await page.waitForTimeout(300);
    expect(searches.length).toBe(searchedRequests);
    await page.getByRole('option', { name: new RegExp(`^${rugby}`) }).click();
    await expect(
      page.getByRole('button', { name: `Remove ${rugby}` }),
    ).toBeVisible();
    await expect(input).toHaveValue('');

    await input.fill(`${prefix} brand new`.slice(0, 20));
    await expect(
      page.getByRole('option', { name: /^Create tag/ }),
    ).toBeVisible();
    await page.getByRole('option', { name: /^Create tag/ }).click();
    await expect(
      page.getByRole('button', {
        name: `Remove ${`${prefix} brand new`.slice(0, 20)}`,
      }),
    ).toBeVisible();

    await input.fill(rugby.toLowerCase());
    await expect(page.getByRole('option', { name: /Create tag/ })).toHaveCount(
      0,
    );
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);
  } finally {
    await sql`delete from users where id in ${sql(accounts)}`;
    await sql.end();
  }
});
