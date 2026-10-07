import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

test('a selected tag outside the popular tags stays visible and removable', async ({
  page,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const cricket = `${prefix}cricket`;
  const owners =
    await sql`insert into users (discord_user_id, discord_username, display_name)
    select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Tags ' || lpad(n::text, 2, '0') from generate_series(1, 34) n returning id`;
  const ids = owners.map((owner) => owner.id);
  try {
    await sql`insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio, tags)
      select case when rn = 1 then now() else now() - interval '1 second' end, id, true, 'en', 'ja', 'intermediate', repeat('A selected tag fixture. ', 6),
        array(select ${prefix} || 'f' || ((rn + k) % 34) from generate_series(0, case when rn = 1 then 6 else 7 end) k) || case when rn = 1 then array[${cricket}] else array[]::text[] end
      from (select id, row_number() over (order by id) - 1 as rn from users where id in ${sql(ids)}) numbered`;

    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/en');
      const cloud = page.getByRole('button', { pressed: false });
      await expect(
        page.getByRole('button', { name: `${cricket} (1)`, exact: true }),
      ).toHaveCount(0);
      await expect(cloud.first()).toBeVisible();

      await page.goto(`/en?tag=${cricket}`);
      const selected = page.getByRole('button', {
        name: `${cricket} (1)`,
        exact: true,
        pressed: true,
      });
      await expect(selected).toBeVisible();
      await expect(page.getByText('1 partner', { exact: true })).toBeVisible();

      await selected.click();
      await expect(page).not.toHaveURL(new RegExp(cricket));
      await expect(
        page.getByRole('button', { name: `${cricket} (1)`, exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole('article').getByRole('button', {
          name: cricket,
          exact: true,
        }),
      ).toBeVisible();
    }
  } finally {
    await sql`delete from users where id in ${sql(ids)}`;
    await sql.end();
  }
});
