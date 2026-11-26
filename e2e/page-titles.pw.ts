import { createHmac, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

test('pages are titled Polycord | page in both locales', async ({
  page,
  context,
}) => {
  for (const [path, title] of [
    ['/en', 'Polycord | Find language exchange partners on Discord'],
    ['/ja', 'Polycord | Discordで言語交換のパートナーを見つけよう'],
    ['/en/legal', 'Polycord | Legal'],
    ['/en/legal/terms', 'Polycord | Terms of Service'],
    ['/ja/legal/privacy', 'Polycord | プライバシーポリシー'],
    ['/ja/legal/guidelines', 'Polycord | コミュニティガイドライン'],
    ['/en/no-such-page', 'Polycord | Page not found'],
  ]) {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
  }

  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const id = randomUUID().replaceAll('-', '');
  const name = `Titled ${id.slice(0, 8)}`;
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
    await page.goto('/ja/onboarding');
    await expect(page).toHaveTitle('Polycord | プロフィール作成');
    const [profile] =
      await sql`insert into profiles (last_bumped_at,user_id,is_public,primary_language,target_language,proficiency_level,bio,tags,country,timezone)
        values (now(),${owner.id},true,'en','ja','beginner','A profile with page titles.','{}','US','UTC') returning id`;
    for (const [path, title] of [
      ['/en/profile', 'Polycord | Profile'],
      ['/ja/profile', 'Polycord | プロフィール'],
      ['/en/saved', 'Polycord | Saved'],
      ['/ja/settings', 'Polycord | 設定'],
      [`/en/u/${profile.id}`, `Polycord | ${name}`],
      [`/ja/u/${profile.id}`, `Polycord | ${name}`],
    ]) {
      await page.goto(path);
      await expect(page).toHaveTitle(title);
    }
  } finally {
    await sql`delete from users where id=${owner.id}`;
    await sql.end();
  }
});
