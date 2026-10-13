import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { type BrowserContext, expect, test } from '@playwright/test';
import postgres from 'postgres';

const profile = {
  isPublic: true,
  allowAnonymousCopy: true,
  displayTimezone: true,
  displayAvailability: true,
  primaryLanguage: 'ja',
  targetLanguages: [{ language: 'en', level: 'native-level' }],
  bio: 'A profile for isolated voice intro player checks.',
  tags: ['Cooking'],
  country: 'JP',
  timezone: 'Asia/Tokyo',
};

const signIn = async (context: BrowserContext, id: string) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const [account] =
    await sql`insert into users (discord_user_id, discord_username, display_name, email) values (${id}, 'voice-test', 'Voice test', 'voice@example.com') on conflict (discord_user_id) do update set display_name = excluded.display_name returning id`;
  await sql.end();
  const payload = Buffer.from(
    JSON.stringify({
      user: {
        id,
        accountId: account.id,
        name: 'Voice test',
        username: 'voice-test',
        email: 'voice@example.com',
      },
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

test('a saved voice intro plays, downloads and stops when removed', async ({
  page,
  context,
}) => {
  const id = randomUUID().replaceAll('-', '');
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  try {
    await signIn(context, id);
    expect(
      (await context.request.post('/api/profile', { data: profile })).status(),
    ).toBe(200);
    const [user] =
      await sql`select id from users where discord_user_id = ${id}`;
    await sql`insert into subscriptions (user_id, stripe_customer_id, status, current_period_end) values (${user.id}, ${id}, 'active', now() + interval '1 day')`;
    const audio = readFileSync('tests/fixtures/voice-short.webm').toString(
      'base64',
    );
    expect(
      (
        await context.request.post('/api/profile/voice', {
          data: {
            audio: `data:audio/webm;base64,${audio}`,
            mimeType: 'audio/webm',
            durationSeconds: 2,
          },
        })
      ).status(),
    ).toBe(200);

    await page.goto('/en/profile');
    const play = page.getByRole('button', { name: 'Play your voice intro' });
    await expect(play).toBeVisible();
    await expect(page.locator('audio[controls]')).toHaveCount(0);

    await play.click();
    await expect(
      page.getByRole('button', { name: 'Pause your voice intro' }),
    ).toBeVisible();
    await expect(play).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('This clip could not be played.')).toHaveCount(
      0,
    );

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Voice intro actions' }).click();
    await page.getByRole('button', { name: 'Download' }).click();
    expect((await download).suggestedFilename()).toBe(
      'polycord-voice-intro.webm',
    );

    await play.click();
    await page
      .getByRole('button', { name: 'Remove voice intro', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: /your voice intro$/ }),
    ).toHaveCount(0);
    expect(
      await sql`select id from voice_intros where user_id = ${user.id}`,
    ).toHaveLength(0);
  } finally {
    await sql`delete from users where discord_user_id = ${id}`;
    await sql.end();
  }
});
