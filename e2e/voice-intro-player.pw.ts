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
    await sql`insert into users (discord_user_id, discord_username, display_name) values (${id}, 'voice-test', 'Voice test') on conflict (discord_user_id) do update set display_name = excluded.display_name returning id`;
  await sql.end();
  const payload = Buffer.from(
    JSON.stringify({
      user: {
        id,
        accountId: account.id,
        name: 'Voice test',
        username: 'voice-test',
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

test('a voice intro recorded during onboarding is saved with the new profile', async ({
  page,
  context,
}) => {
  const id = randomUUID().replaceAll('-', '');
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  try {
    await signIn(context, id);
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const audio = new AudioContext();
        const tone = audio.createOscillator();
        const destination = audio.createMediaStreamDestination();
        tone.connect(destination);
        tone.start();
        return destination.stream;
      };
    });
    await page.goto('/en/onboarding');
    await page.evaluate(
      ([key, draft]) => sessionStorage.setItem(key, draft),
      [`polycord:profile:${id}`, JSON.stringify(profile)],
    );
    await page.reload();
    await page.getByRole('button', { name: 'Record voice intro' }).click();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Stop recording' }).click();
    await expect(
      page.getByText(
        /-second clip will be saved to your card when you publish your profile\.$/,
      ),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save clip' })).toHaveCount(
      0,
    );

    await page.route('**/api/profile/voice', (route) =>
      route.fulfill({ status: 500, json: {} }),
    );
    await page
      .getByRole('button', { name: 'Publish profile', exact: true })
      .click();
    await expect(
      page.getByText(
        'Your profile was saved, but your voice intro was not. Publish again to retry, or discard the clip.',
      ),
    ).toBeVisible();
    await expect(page).toHaveURL('/en/onboarding');

    await page.unroute('**/api/profile/voice');
    await page
      .getByRole('button', { name: 'Publish profile', exact: true })
      .click();
    await expect(page).toHaveURL('/en');
    const [intro] =
      await sql`select duration_seconds from voice_intros join users on users.id = voice_intros.user_id where users.discord_user_id = ${id}`;
    expect(intro.duration_seconds).toBeGreaterThan(0);
    await page.goto('/en/profile');
    await expect(
      page.getByText(/-second intro is live on your card\.$/),
    ).toBeVisible();
  } finally {
    await sql`delete from users where discord_user_id = ${id}`;
    await sql.end();
  }
});

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
    await sql`update users set premium_granted_until = now() + interval '1 day' where id = ${user.id}`;
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

test('voice intro limits follow the owner plan and keep longer clips after Supporter ends', async ({
  page,
  context,
  request,
}) => {
  const id = randomUUID().replaceAll('-', '');
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const upload = (file: string) =>
    context.request.post('/api/profile/voice', {
      data: {
        audio: `data:audio/webm;base64,${readFileSync(`tests/fixtures/${file}.webm`).toString('base64')}`,
        mimeType: 'audio/webm',
        durationSeconds: 1,
      },
    });
  try {
    await signIn(context, id);
    expect(
      (await context.request.post('/api/profile', { data: profile })).status(),
    ).toBe(200);
    const [owner] =
      await sql`select users.id, profiles.id as profile_id from users join profiles on profiles.user_id = users.id where discord_user_id = ${id}`;
    const publicClip = async () =>
      (await request.get(`/api/voice/${owner.profile_id}`)).status();
    const ownClip = async () =>
      (await context.request.get(`/api/voice/${owner.profile_id}`)).status();

    expect((await upload('voice-8s-over')).status()).toBe(400);
    const saved = await upload('voice-8s');
    expect(saved.status()).toBe(200);
    expect(await saved.json()).toEqual({ durationSeconds: 8 });
    expect(await publicClip()).toBe(200);

    await sql`update users set premium_granted_until = now() + interval '1 day' where id = ${owner.id}`;
    expect((await upload('voice-long')).status()).toBe(400);
    expect((await upload('voice-20s')).status()).toBe(200);
    expect(await publicClip()).toBe(200);

    await sql`update users set premium_granted_until = now() - interval '1 day' where id = ${owner.id}`;
    expect(await publicClip()).toBe(404);
    expect(await ownClip()).toBe(200);
    expect(
      await sql`select duration_seconds from voice_intros where user_id = ${owner.id}`,
    ).toEqual([{ duration_seconds: 20 }]);
    await page.goto('/en/profile');
    await expect(
      page
        .getByText(
          'Your 20-second intro is hidden because Free intros can be up to 8 seconds.',
          { exact: false },
        )
        .first(),
    ).toBeVisible();

    await sql`update users set premium_granted_until = now() + interval '1 day' where id = ${owner.id}`;
    expect(await publicClip()).toBe(200);
  } finally {
    await sql`delete from users where discord_user_id = ${id}`;
    await sql.end();
  }
});
