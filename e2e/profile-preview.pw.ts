import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

const discordbot = {
  'User-Agent':
    'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
};

const meta = (html: string, key: string) =>
  html.match(
    new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`),
  )?.[1];

test('shared profile links expose preview metadata and images only while visible', async ({
  request,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const username = `preview.${prefix}`;
  const [user] =
    await sql`insert into users (discord_user_id, discord_username, display_name) values (${prefix}, ${username}, ${`${prefix} Preview`}) returning id`;
  try {
    const [profile] =
      await sql`insert into profiles (last_bumped_at, user_id, is_public, allow_anonymous_copy, primary_language, target_language, proficiency_level, bio, tags, card_color, country, timezone)
      values (now(), ${user.id}, true, true, 'ja', 'en', 'intermediate', 'Weekend hiker practising English.', array['Hiking'], 'pink', 'JP', 'Asia/Tokyo') returning id`;
    const page = (locale = 'en') =>
      request.get(`/${locale}/u/${profile.id}`, { headers: discordbot });
    const image = (path: string) =>
      request.get(new URL(path).pathname + new URL(path).search);

    const html = await (await page()).text();
    expect(meta(html, 'og:title')).toBe(`${prefix} Preview`);
    expect(meta(html, 'og:description')).toBe(
      'Weekend hiker practising English.',
    );
    expect(meta(html, 'og:site_name')).toBe('Polycord');
    expect(meta(html, 'og:url')).toMatch(
      new RegExp(`^https?://[^/]+/en/u/${profile.id}$`),
    );
    expect(meta(html, 'og:image:width')).toBe('1200');
    expect(meta(html, 'og:image:height')).toBe('630');
    expect(meta(html, 'og:image:type')).toBe('image/png');
    expect(meta(html, 'twitter:card')).toBe('summary_large_image');
    expect(meta(html, 'theme-color')).toBe('#f9a8cf');
    expect(meta(await (await page('ja')).text(), 'og:image:alt')).toBe(
      `${prefix} PreviewさんのPolycordプロフィールカード`,
    );

    const imageUrl = meta(html, 'og:image') as string;
    expect(imageUrl).toMatch(
      new RegExp(`^https?://[^/]+/en/u/${profile.id}/og\\?v=\\d+$`),
    );
    const png = await image(imageUrl);
    expect(png.status()).toBe(200);
    expect(png.headers()['content-type']).toBe('image/png');
    expect(png.headers()['cache-control']).toBe('no-store');
    const body = await png.body();
    expect(body.subarray(1, 4).toString()).toBe('PNG');
    expect([body.readUInt32BE(16), body.readUInt32BE(20)]).toEqual([1200, 630]);

    await sql`update profiles set bio = 'Weekend hiker learning Korean too.', updated_at = now() where id = ${profile.id}`;
    const edited = await (await page()).text();
    expect(meta(edited, 'og:description')).toBe(
      'Weekend hiker learning Korean too.',
    );
    expect(meta(edited, 'og:image')).not.toBe(imageUrl);

    await sql`update profiles set allow_anonymous_copy = false where id = ${profile.id}`;
    expect(await (await page()).text()).not.toContain(username);

    for (const [hide, restore] of [
      [
        () =>
          sql`update profiles set is_public = false where id = ${profile.id}`,
        () =>
          sql`update profiles set is_public = true where id = ${profile.id}`,
      ],
      [
        () =>
          sql`update profiles set hidden_by_moderation = true where id = ${profile.id}`,
        () =>
          sql`update profiles set hidden_by_moderation = false where id = ${profile.id}`,
      ],
      [
        () => sql`update users set banned_at = now() where id = ${user.id}`,
        () => sql`update users set banned_at = null where id = ${user.id}`,
      ],
      [
        () =>
          sql`update users set suspended_until = now() + interval '1 day' where id = ${user.id}`,
        () =>
          sql`update users set suspended_until = null where id = ${user.id}`,
      ],
    ]) {
      await hide();
      const hidden = await page();
      expect(hidden.status()).toBe(404);
      expect(meta(await hidden.text(), 'og:image')).toBeUndefined();
      expect((await image(imageUrl)).status()).toBe(404);
      await restore();
    }
    expect((await image(imageUrl)).status()).toBe(200);
    expect((await request.get(`/en/u/${randomUUID()}/og`)).status()).toBe(404);
  } finally {
    await sql`delete from users where id = ${user.id}`;
    await sql.end();
  }
});
