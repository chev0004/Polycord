import { randomUUID } from 'node:crypto';
import { expect, type Locator, test } from '@playwright/test';
import postgres from 'postgres';

const sky = 'rgb(193, 213, 233)';
const pink = 'rgb(249, 168, 207)';

const background = (locator: Locator) =>
  locator.evaluate((element) => getComputedStyle(element).backgroundColor);

test('public profiles keep the card colour shown in discovery', async ({
  page,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const cases = [
    ['pink', pink],
    [null, sky],
    ['blue', sky],
  ] as const;
  const owners =
    await sql`insert into users (discord_user_id, discord_username, display_name)
    select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Theme ' || n from generate_series(1,${cases.length}) n returning id, display_name`;
  try {
    for (const [index, [colour]] of cases.entries()) {
      await sql`insert into profiles (last_bumped_at,user_id,is_public,primary_language,target_language,proficiency_level,bio,tags,card_color)
        values (now(),${owners[index].id},true,'en','ja','beginner','A card colour fixture.',array[${prefix}],${colour})`;
    }
    const banner = page.locator('main article > div').first();
    for (const [index, [, expected]] of cases.entries()) {
      await page.goto(`/en?tag=${prefix}`);
      const card = page.locator('article').filter({
        has: page.getByRole('heading', {
          name: owners[index].display_name,
          exact: true,
        }),
      });
      expect(await background(card.locator(':scope > div > div').first())).toBe(
        expected,
      );
      await card.click();
      await expect(page).toHaveURL(/\/en\/u\//);
      expect(await background(banner)).toBe(expected);
      await page.reload();
      expect(await background(banner)).toBe(expected);
      await page.goto(new URL(page.url()).pathname);
      expect(await background(banner)).toBe(expected);
    }
  } finally {
    await sql`delete from users where id in ${sql(owners.map((owner) => owner.id))}`;
    await sql.end();
  }
});
