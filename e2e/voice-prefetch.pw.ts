import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { type BrowserContext, expect, test } from '@playwright/test';
import postgres from 'postgres';

const clip = readFileSync('tests/fixtures/voice-short.webm').toString('base64');

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

const setup = async () => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = `Voice${randomUUID().slice(0, 6)}`;
  const members: {
    id: string;
    profileId: string;
    identity: { id: string; name: string; username: string };
  }[] = [];
  for (const index of [0, 1, 2, 3]) {
    const identity = {
      id: randomUUID().replaceAll('-', ''),
      name: `${prefix} ${index === 0 ? 'Viewer' : `Speaker${index}`}`,
      username: `${prefix.toLowerCase()}${index}`,
    };
    const [account] =
      await sql`insert into users (discord_user_id, discord_username, display_name) values (${identity.id}, ${identity.username}, ${identity.name}) returning id`;
    const [profile] =
      await sql`insert into profiles (last_bumped_at, user_id, is_public, allow_anonymous_copy, primary_language, target_language, proficiency_level, bio, voice_intro_seconds) values (now(), ${account.id}, true, false, 'en', 'ja', 'beginner', ${`${prefix} bio`}, ${index === 0 ? null : 1}) returning id`;
    if (index > 0) {
      await sql`insert into subscriptions (user_id, stripe_customer_id, status, current_period_end) values (${account.id}, ${`test-${randomUUID()}`}, 'active', now() + interval '1 day')`;
      await sql`insert into voice_intros (user_id, mime_type, duration_seconds, size_bytes, data) values (${account.id}, 'audio/webm', 1, 3, ${clip})`;
    }
    members.push({ id: account.id, profileId: profile.id, identity });
  }
  return {
    sql,
    prefix,
    viewer: members[0],
    speakers: members.slice(1),
    cleanup: async () => {
      await sql`delete from users where id in ${sql(members.map(({ id }) => id))}`;
      await sql.end();
    },
  };
};

test('visible Premium cards share one batch request and pressing play makes none', async ({
  page,
  context,
}) => {
  const { prefix, viewer, speakers, cleanup } = await setup();
  try {
    await signIn(context, viewer.identity, viewer.id);
    await page.addInitScript(() => {
      const timing = window as unknown as { pressed: number; playing: number };
      document.addEventListener(
        'click',
        () => {
          timing.pressed = performance.now();
        },
        true,
      );
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
        this.addEventListener(
          'playing',
          () => {
            timing.playing = performance.now();
          },
          { once: true },
        );
        return play.call(this);
      };
    });
    const voiceRequests: string[] = [];
    page.on('request', (request) => {
      const { pathname } = new URL(request.url());
      if (pathname.startsWith('/api/voice')) voiceRequests.push(request.url());
    });
    const batch = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/voice',
    );
    await page.goto(`/en?q=${encodeURIComponent(prefix)}`);
    const body = await (await batch).json();
    expect(Object.keys(body.clips).sort()).toEqual(
      speakers.map(({ profileId }) => profileId).sort(),
    );
    expect(voiceRequests).toHaveLength(1);
    expect(
      new URL(voiceRequests[0]).searchParams.get('ids')?.split(','),
    ).toEqual(
      expect.arrayContaining(speakers.map(({ profileId }) => profileId)),
    );

    const chips = page.getByRole('button', { name: 'Play voice intro' });
    await expect(chips).toHaveCount(speakers.length);
    voiceRequests.length = 0;
    await chips.first().click();
    await expect(
      page.getByRole('button', { name: 'Stop voice intro' }),
    ).toBeVisible();
    await page.waitForTimeout(500);
    expect(voiceRequests).toEqual([]);
    const pressToPlaying = await page.evaluate(() => {
      const timing = window as unknown as { pressed: number; playing: number };
      return timing.playing - timing.pressed;
    });
    expect(pressToPlaying).toBeLessThan(100);
  } finally {
    await cleanup();
  }
});

test('a press during a pending prefetch reuses its request', async ({
  page,
  context,
}) => {
  const { prefix, viewer, cleanup } = await setup();
  try {
    await signIn(context, viewer.identity, viewer.id);
    const requests: string[] = [];
    await page.route('**/api/voice**', async (route) => {
      requests.push(route.request().url());
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await page.goto(`/en?q=${encodeURIComponent(prefix)}`);
    const chip = page.getByRole('button', { name: 'Play voice intro' }).first();
    await expect(chip).toBeVisible();
    await expect.poll(() => requests.length).toBeGreaterThan(0);
    await chip.click();
    await expect(
      page.getByRole('button', { name: 'Stop voice intro' }),
    ).toBeVisible();
    await page.waitForTimeout(2500);
    expect(requests).toHaveLength(1);
  } finally {
    await cleanup();
  }
});

test('clips follow replacement, deletion, Premium, blocks and bans immediately', async ({
  context,
}) => {
  const { sql, viewer, speakers, cleanup } = await setup();
  try {
    await signIn(context, viewer.identity, viewer.id);
    const ids = speakers.map(({ profileId }) => profileId).join(',');
    const batch = async () =>
      (await (await context.request.get(`/api/voice?ids=${ids}`)).json())
        .clips as Record<string, { mimeType: string; data: string }>;
    const [first, second, third] = speakers;

    expect(Object.keys(await batch())).toHaveLength(3);
    expect(first.profileId in (await batch())).toBe(true);

    const total = Buffer.from(clip, 'base64').length;
    const single = await context.request.get(`/api/voice/${first.profileId}`);
    expect(single.status()).toBe(200);
    expect(single.headers()['accept-ranges']).toBe('bytes');
    const partial = await context.request.get(`/api/voice/${first.profileId}`, {
      headers: { Range: 'bytes=0-9' },
    });
    expect(partial.status()).toBe(206);
    expect(partial.headers()['content-range']).toBe(`bytes 0-9/${total}`);
    expect((await partial.body()).length).toBe(10);
    const tail = await context.request.get(`/api/voice/${first.profileId}`, {
      headers: { Range: 'bytes=-5' },
    });
    expect(tail.headers()['content-range']).toBe(
      `bytes ${total - 5}-${total - 1}/${total}`,
    );
    expect(
      (
        await context.request.get(`/api/voice/${first.profileId}`, {
          headers: { Range: `bytes=${total}-` },
        })
      ).status(),
    ).toBe(416);

    await sql`update voice_intros set data = 'YWJj' where user_id = ${first.id}`;
    expect((await batch())[first.profileId].data).toBe('YWJj');

    await sql`delete from voice_intros where user_id = ${first.id}`;
    await sql`update profiles set voice_intro_seconds = null where user_id = ${first.id}`;
    expect(first.profileId in (await batch())).toBe(false);
    expect(
      (await context.request.get(`/api/voice/${first.profileId}`)).status(),
    ).toBe(404);

    await sql`update subscriptions set status = 'canceled' where user_id = ${second.id}`;
    expect(second.profileId in (await batch())).toBe(false);
    expect(
      (await context.request.get(`/api/voice/${second.profileId}`)).status(),
    ).toBe(404);

    await sql`insert into user_blocks (blocker_user_id, blocked_user_id) values (${viewer.id}, ${third.id})`;
    expect(Object.keys(await batch())).toEqual([]);
    expect(
      (await context.request.get(`/api/voice/${third.profileId}`)).status(),
    ).toBe(404);
  } finally {
    await cleanup();
  }
});

test('banned callers receive 403 from both voice routes', async ({
  context,
}) => {
  const { sql, speakers, cleanup } = await setup();
  const ip = `203.0.113.${100 + Math.floor(Math.random() * 100)}`;
  try {
    await sql`insert into ip_bans (id, ip) values (${randomUUID()}, ${ip})`;
    for (const path of [
      `/api/voice?ids=${speakers[0].profileId}`,
      `/api/voice/${speakers[0].profileId}`,
    ]) {
      const response = await context.request.get(path, {
        headers: { 'x-test-client-ip': ip },
      });
      expect(response.status()).toBe(403);
      expect(await response.json()).toEqual({ error: 'Forbidden' });
    }
    expect(
      (
        await context.request.get(`/api/voice/${speakers[0].profileId}`, {
          headers: { 'x-test-client-ip': '203.0.113.99' },
        })
      ).status(),
    ).toBe(200);
  } finally {
    await sql`delete from ip_bans where ip = ${ip}`;
    await cleanup();
  }
});
