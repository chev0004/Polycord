import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

test('a ninth discovery tag is disabled and never reaches the url', async ({
  page,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const tags = Array.from({ length: 12 }, (_, index) => `${prefix}t${index}`);
  const owners =
    await sql`insert into users (discord_user_id, discord_username, display_name)
    select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Limit ' || lpad(n::text, 2, '0') from generate_series(1, 4) n returning id`;
  const ids = owners.map((owner) => owner.id);
  try {
    await sql`insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio, tags)
      select now(), id, true, 'en', 'ja', 'intermediate', 'A tag limit fixture.',
        array(select ${prefix} || 't' || ((rn * 3 + k) % 12) from generate_series(0, 5) k)
      from (select id, row_number() over (order by id) - 1 as rn from users where id in ${sql(ids)}) numbered`;
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(
      `/en?${tags
        .slice(0, 8)
        .map((tag) => `tag=${tag}`)
        .join('&')}`,
    );
    const option = (tag: string) =>
      page.getByRole('button', { name: new RegExp(`^${tag} [(][0-9]+[)]$`) });
    await expect(option(tags[8])).toBeDisabled();
    await expect(option(tags[0])).toBeEnabled();
    await expect(page.getByText('Maximum of 8 tags selected')).toBeVisible();

    const before = page.url();
    const history = await page.evaluate(() => window.history.length);
    await option(tags[8]).click({ force: true });
    await option(tags[8])
      .focus()
      .catch(() => {});
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    expect(page.url()).toBe(before);
    expect(await page.evaluate(() => window.history.length)).toBe(history);
    await expect(option(tags[8])).toHaveAttribute('aria-pressed', 'false');

    await option(tags[0]).click();
    await expect(option(tags[8])).toBeEnabled();
    await option(tags[8]).click();
    await expect(option(tags[8])).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(new RegExp(`tag=${tags[8]}`));
  } finally {
    await sql`delete from users where id in ${sql(ids)}`;
    await sql.end();
  }
});
