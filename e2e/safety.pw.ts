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

test('guest payloads omit restricted usernames and mutual blocks survive navigation', async ({
  page,
  context,
  request,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const identities = ['Safety viewer', 'Safety target'].map((name) => ({
    id: randomUUID().replaceAll('-', ''),
    name: `${name} ${randomUUID().slice(0, 6)}`,
    username: `secret-${randomUUID()}`,
  }));
  const accounts: { id: string; profileId: string }[] = [];
  try {
    for (const user of identities) {
      const [account] =
        await sql`insert into users (discord_user_id, discord_username, display_name) values (${user.id}, ${user.username}, ${user.name}) returning id`;
      const [profile] =
        await sql`insert into profiles (last_bumped_at,user_id, is_public, allow_anonymous_copy, primary_language, target_language, proficiency_level, bio, voice_intro_seconds) values (now(),${account.id}, true, false, 'en', 'ja', 'beginner', 'Privacy test language partner profile.', 1) returning id`;
      accounts.push({ id: account.id, profileId: profile.id });
      await sql`insert into subscriptions (user_id, stripe_customer_id, status, current_period_end) values (${account.id}, ${`test-${randomUUID()}`}, 'active', now() + interval '1 day')`;
      await sql`insert into voice_intros (user_id, mime_type, duration_seconds, size_bytes, data) values (${account.id}, 'audio/webm', 1, 3, 'YWJj')`;
    }
    const [viewer, target] = accounts;
    for (const route of ['/en', `/en/u/${target.profileId}`]) {
      const html = await request.get(route);
      expect(html.ok()).toBe(true);
      expect(await html.text()).not.toContain(identities[1].username);
      const rsc = await request.get(route, { headers: { RSC: '1' } });
      expect(rsc.headers()['content-type']).toContain('text/x-component');
      expect(await rsc.text()).not.toContain(identities[1].username);
    }
    await signIn(context, identities[0], accounts[0].id);
    expect(
      await (await context.request.get(`/en/u/${target.profileId}`)).text(),
    ).toContain(identities[1].username);
    expect(
      (
        await context.request.post('/api/saved', {
          data: { profileId: target.profileId },
        })
      ).status(),
    ).toBe(200);
    const voice = await context.request.get(`/api/voice/${target.profileId}`);
    expect(voice.status()).toBe(200);
    expect(voice.headers()['cache-control']).toContain('no-store');
    await page.goto(`/en/u/${target.profileId}`);
    const blocked = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/block') &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('button', { name: 'Block user', exact: true }).click();
    expect((await blocked).status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: 'You blocked this user' }),
    ).toBeVisible();
    await page.goto('/en');
    await expect(
      page.getByRole('heading', { name: identities[1].name, exact: true }),
    ).toHaveCount(0);
    await page.goto('/en/saved');
    await expect(
      page.getByRole('heading', { name: identities[1].name, exact: true }),
    ).toHaveCount(0);
    expect(
      (await context.request.get(`/en/u/${target.profileId}`)).status(),
    ).toBe(404);
    expect(
      (await context.request.get(`/api/voice/${target.profileId}`)).status(),
    ).toBe(404);
    for (const route of ['saved', 'report', 'notifications']) {
      expect(
        (
          await context.request.post(`/api/${route}`, {
            data: { profileId: target.profileId, reason: 'spam' },
          })
        ).status(),
      ).toBe(404);
    }
    await signIn(context, identities[1], accounts[1].id);
    expect(
      (await context.request.get(`/en/u/${viewer.profileId}`)).status(),
    ).toBe(404);
    expect(
      (await context.request.get(`/api/voice/${viewer.profileId}`)).status(),
    ).toBe(404);
    expect((await context.request.get('/api/block')).ok()).toBe(true);
    expect(
      (await (await context.request.get('/api/block')).json()).users,
    ).toEqual([]);
    await signIn(context, identities[0], accounts[0].id);
    await page.goto('/en/settings');
    await page.getByRole('button', { name: 'Privacy', exact: true }).click();
    await page.getByRole('button', { name: /^Blocked accounts/ }).click();
    await page
      .getByRole('button', {
        name: `Unblock ${identities[1].name}`,
        exact: true,
      })
      .click();
    await expect(page.getByText('You have no blocked accounts.')).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Privacy', exact: true }).click();
    await page.getByRole('button', { name: /^Blocked accounts/ }).click();
    await expect(page.getByText('You have no blocked accounts.')).toBeVisible();
    await page.goto('/en/saved');
    await expect(
      page.getByRole('heading', { name: identities[1].name, exact: true }),
    ).toBeVisible();
    expect(
      (await context.request.get(`/en/u/${target.profileId}`)).status(),
    ).toBe(200);
    for (const mutation of [
      () =>
        sql`update profiles set is_public = false where id = ${target.profileId}`,
      () =>
        sql`update profiles set is_public = true, hidden_by_moderation = true where id = ${target.profileId}`,
      () =>
        sql`update users set suspended_until = now() + interval '1 day' where id = ${target.id}`,
      () =>
        sql`update users set suspended_until = null, banned_at = now() where id = ${target.id}`,
    ]) {
      await mutation();
      expect(
        (await context.request.get(`/api/voice/${target.profileId}`)).status(),
      ).toBe(404);
      await sql`update profiles set hidden_by_moderation = false where id = ${target.profileId}`;
    }
    await sql`update users set banned_at = null where id = ${target.id}`;
    await sql`update profiles set is_public = false where id = ${target.profileId}`;
    await signIn(context, identities[1], accounts[1].id);
    expect(
      (await context.request.get(`/api/voice/${target.profileId}`)).status(),
    ).toBe(200);
    await sql`delete from profiles where id = ${target.profileId}`;
    expect(
      (await context.request.get(`/api/voice/${target.profileId}`)).status(),
    ).toBe(404);
  } finally {
    for (const user of identities)
      await sql`delete from users where discord_user_id = ${user.id}`;
    await sql.end();
  }
});

test('blocked accounts show usernames and a restricted current preview', async ({
  page,
  context,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const identities = [
    'Preview viewer',
    'Preview target',
    'Preview stranger',
  ].map((name) => ({
    id: randomUUID().replaceAll('-', ''),
    name: `${name} ${randomUUID().slice(0, 6)}`,
    username: `preview.${randomUUID().slice(0, 8)}`,
  }));
  const accounts: string[] = [];
  try {
    for (const user of identities) {
      const [account] =
        await sql`insert into users (discord_user_id, discord_username, display_name) values (${user.id}, ${user.username}, ${user.name}) returning id`;
      await sql`insert into profiles (last_bumped_at, user_id, is_public, primary_language, target_language, proficiency_level, bio, tags, card_color) values (now(), ${account.id}, true, 'en', 'ja', 'beginner', 'The bio from when they were blocked.', array['Hiking'], 'pink')`;
      accounts.push(account.id);
    }
    const [viewer, target, stranger] = accounts;
    await sql`insert into user_blocks (blocker_user_id, blocked_user_id) values (${viewer}, ${target})`;
    await signIn(context, identities[0], viewer);

    expect(
      (await (await context.request.get('/api/block')).json()).users,
    ).toEqual([
      {
        id: target,
        displayName: identities[1].name,
        username: identities[1].username,
      },
    ]);
    await sql`insert into subscriptions (user_id, stripe_customer_id, status, current_period_end) values (${target}, ${`cus_${identities[1].id}`}, 'active', now() + interval '30 days')`;
    await sql`update profiles set bio = 'The bio they have today.', voice_intro_seconds = 12 where user_id = ${target}`;
    const preview = await context.request.get(`/api/block/${target}`);
    expect(preview.status()).toBe(200);
    const { profile } = await preview.json();
    expect(profile.about).toBe('The bio they have today.');
    expect(profile).not.toHaveProperty('lastBumpedAt');
    expect(profile).not.toHaveProperty('voiceIntroSeconds');
    expect((await context.request.get(`/api/block/${stranger}`)).status()).toBe(
      404,
    );

    await page.goto('/en/settings');
    await page.getByRole('button', { name: 'Privacy', exact: true }).click();
    await page.getByRole('button', { name: /^Blocked accounts/ }).click();
    await expect(page.getByText(`@${identities[1].username}`)).toBeVisible();
    await page
      .getByRole('button', {
        name: `Preview ${identities[1].name}'s profile`,
        exact: true,
      })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('The bio they have today.')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Card menu' })).toHaveCount(
      0,
    );
    await expect(dialog.getByText(/ago|just now/i)).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Close preview' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/en\/settings/);
    await expect(
      page.getByRole('button', {
        name: `Unblock ${identities[1].name}`,
        exact: true,
      }),
    ).toBeVisible();

    await sql`insert into user_blocks (blocker_user_id, blocked_user_id) values (${target}, ${viewer})`;
    expect((await context.request.get(`/api/block/${target}`)).status()).toBe(
      404,
    );
    await sql`delete from user_blocks where blocker_user_id = ${target}`;
    await sql`update profiles set is_public = false where user_id = ${target}`;
    expect((await context.request.get(`/api/block/${target}`)).status()).toBe(
      404,
    );
  } finally {
    await sql`delete from users where id in ${sql(accounts)}`;
    await sql.end();
  }
});
