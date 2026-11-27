import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

test('the advertise page shows grouped audience totals, placements and prices', async ({
  page,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const insertProfiles = async (
    label: string,
    total: number,
    primary: string,
    synthetic: boolean,
  ) => {
    const users = await sql<{ id: string }[]>`
      insert into users (discord_user_id, discord_username, display_name, is_synthetic)
      select ${prefix} || ${label} || n, ${prefix} || ${label} || n, ${label} || ' ' || n, ${synthetic}
      from generate_series(1, ${total}) as n
      returning id`;
    for (const { id } of users) {
      const [profile] = await sql<{ id: string }[]>`
        insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio, country)
        values (now(), ${id}, true, ${primary}, 'sw', 'beginner', 'Audience fixture profile.', 'IS')
        returning id`;
      await sql`insert into profile_target_languages (profile_id, language, proficiency_level, position) values (${profile.id}, 'sw', 'beginner', 0)`;
    }
  };

  try {
    await insertProfiles('-real-', 30, 'tl', false);
    await insertProfiles('-dummy-', 30, 'eo', true);

    const hosts = new Set<string>();
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.protocol.startsWith('http')) hosts.add(url.host);
    });

    await page.goto('/en');
    await page
      .getByRole('contentinfo')
      .getByRole('link', { name: 'Advertise' })
      .click();
    await expect(page).toHaveURL(/\/en\/advertise$/);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Reach people learning languages on Discord',
      }),
    ).toBeVisible();

    const speak = page.getByRole('heading', { name: 'Languages people speak' });
    await expect(speak).toBeVisible();
    const speakList = speak.locator('xpath=..');
    await expect(speakList.getByText('Tagalog')).toBeVisible();
    await expect(speakList.getByText('Esperanto')).toHaveCount(0);
    const learnList = page
      .getByRole('heading', { name: 'Languages people are learning' })
      .locator('xpath=..');
    await expect(learnList.getByText('Swahili')).toBeVisible();
    const countryList = page
      .getByRole('heading', { name: 'Countries' })
      .locator('xpath=..');
    await expect(countryList.getByText('Iceland')).toBeVisible();
    await expect(page.getByText('Public profiles')).toBeVisible();

    await expect(page.getByText('$50 per 30 days')).toBeVisible();
    await expect(page.getByText('$100 per 30 days')).toBeVisible();
    await expect(page.getByText('Image: 1080 × 1350')).toBeVisible();
    await expect(
      page.getByText('No dating, adult content or gambling.'),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Book a spot' }),
    ).toBeVisible();
    expect([...hosts]).toEqual(['localhost:3119']);

    await page.goto('/ja/advertise');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Discordで語学を学ぶ人たちに届ける',
      }),
    ).toBeVisible();
    await expect(page.getByText('30日間で$50')).toBeVisible();
    await expect(page.getByText('タガログ語')).toBeVisible();
    await expect(page.getByText('エスペラント')).toHaveCount(0);
  } finally {
    await sql`delete from users where discord_user_id like ${`${prefix}-%`}`;
    await sql.end();
  }
});
