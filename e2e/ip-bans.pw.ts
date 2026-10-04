import { createHmac, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';

const SECRET = 'polycord-isolated-audit-secret';
const ORIGIN = 'http://localhost:3119';
const BLOCKED = '198.51.100.7';
const OTHER = '203.0.113.9';
const IPV6 = '2001:db8::7a';

const sign = (payload: object) => {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${createHmac('sha256', SECRET).update(body).digest('base64url')}`;
};

type Account = { id: string; discordUserId: string };

const sessionFor = ({ id, discordUserId }: Account) =>
  sign({
    user: {
      id: discordUserId,
      accountId: id,
      name: discordUserId,
      username: discordUserId,
    },
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600000,
  });

const banMarkerFor = (discordUserId: string) =>
  sign({ discordUserId, expiresAt: Date.now() + 3600000 });

const from = (ip?: string, extra: Record<string, string> = {}) => ({
  headers: { ...(ip ? { 'x-test-client-ip': ip } : {}), ...extra },
  maxRedirects: 0,
});

const withSession = (account: Account) => ({
  Cookie: `polycord_session=${sessionFor(account)}`,
});

test.describe('ip bans', () => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  let accounts: Account[];

  test.beforeAll(async () => {
    await sql`delete from users where discord_user_id = 'e2e-admin'`;
    accounts = await sql<
      Account[]
    >`insert into users (discord_user_id, discord_username, display_name)
      values (${`${prefix}-a`}, ${`${prefix}-a`}, 'Ban A'), (${`${prefix}-b`}, ${`${prefix}-b`}, 'Ban B'), ('e2e-admin', 'e2e-admin', 'E2E Admin')
      returning id, discord_user_id as "discordUserId"`;
  });

  test.beforeEach(async () => {
    await sql`delete from ip_bans`;
    await sql`delete from moderation_restrictions where discord_user_id like ${`${prefix}%`}`;
    await sql`update users set banned_at = null where discord_user_id like ${`${prefix}%`}`;
  });

  test.afterAll(async () => {
    await sql`delete from ip_bans`;
    await sql`delete from moderation_restrictions where discord_user_id like ${`${prefix}%`}`;
    await sql`delete from users where id in ${sql(accounts.map(({ id }) => id))}`;
    await sql.end();
  });

  const block = (ip: string, reason = 'test') =>
    sql`insert into ip_bans (ip, reason) values (${ip}, ${reason}) returning id`;

  test('a blocked ip sees only the banned screen on every page', async ({
    request,
  }) => {
    await block(BLOCKED);

    for (const path of ['/en', '/en/u/anything', '/en/user/someone', '/ja']) {
      const response = await request.get(path, from(BLOCKED));
      expect(response.status(), path).toBe(403);
      expect(response.headers()['cache-control']).toContain('no-store');
      const html = await response.text();
      expect(html).not.toContain('Find a language partner');
    }

    const english = await request.get('/en', from(BLOCKED));
    expect(await english.text()).toContain('You Have Been Banned');
    const japanese = await (await request.get('/ja', from(BLOCKED))).text();
    expect(japanese).toContain('利用停止になりました');
    expect(japanese).toMatch(/PC-[0-9A-Z]{4}-[0-9A-Z]{4}/);

    expect((await request.get('/en', from(OTHER))).status()).toBe(200);
    expect((await request.get('/en')).status()).toBe(200);
  });

  test('apis, media, caches and metadata routes are denied', async ({
    request,
  }) => {
    await block(BLOCKED);

    for (const path of [
      '/api/discovery',
      '/api/voice/00000000-0000-0000-0000-000000000000',
      '/api/notifications',
      '/_next/image?url=%2Ficon-192.png&w=64&q=75',
      '/robots.txt',
      '/sitemap.xml',
      '/icon-192.png',
      '/sw.js',
    ]) {
      const response = await request.get(path, from(BLOCKED));
      expect(response.status(), path).toBe(403);
      expect(await response.text()).not.toContain('Find a language partner');
    }

    for (const method of ['post', 'put', 'delete'] as const) {
      expect(
        (await request[method]('/api/saved', from(BLOCKED))).status(),
        method,
      ).toBe(403);
    }

    expect(
      (await request.get('/polycord-wordmark.svg', from(BLOCKED))).status(),
    ).toBe(200);
    expect((await request.get('/api/health', from(BLOCKED))).status()).toBe(
      200,
    );
    expect(
      (
        await request.post('/api/billing/webhook', {
          ...from(BLOCKED),
          data: '{}',
        })
      ).status(),
    ).toBe(400);
  });

  test('forwarding headers cannot spoof or poison the block', async ({
    request,
  }) => {
    await block(BLOCKED);

    const spoofed = from(OTHER, {
      'x-forwarded-for': BLOCKED,
      'x-real-ip': BLOCKED,
    });
    expect((await request.get('/en', spoofed)).status()).toBe(200);
    expect(
      (
        await request.get('/en', from(BLOCKED, { 'x-forwarded-for': OTHER }))
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.get('/en', { headers: { 'x-forwarded-for': BLOCKED } })
      ).status(),
    ).toBe(200);
  });

  test('ipv4 and ipv6 spellings are normalized to the same block', async ({
    request,
  }) => {
    await block(IPV6);
    await block(BLOCKED);

    for (const spelling of [
      '2001:0DB8:0:0:0:0:0:7A',
      '[2001:db8::7a]',
      '::ffff:198.51.100.7',
      '::ffff:c633:6407',
    ]) {
      const response = await request.get('/en', from(spelling));
      expect(response.status(), spelling).toBe(403);
    }
    expect((await request.get('/en', from('2001:db8::7b'))).status()).toBe(200);
  });

  test('alternate accounts on a blocked ip are denied without being banned', async ({
    browser,
  }) => {
    await block(BLOCKED);
    const [member] = accounts;
    const context = await browser.newContext({
      baseURL: ORIGIN,
      extraHTTPHeaders: { 'x-test-client-ip': BLOCKED },
    });
    await context.addCookies([
      { name: 'polycord_session', value: sessionFor(member), url: ORIGIN },
    ]);
    const settings = await context.request.get('/en/settings', {
      maxRedirects: 0,
    });
    expect(settings.status()).toBe(403);
    expect((await context.request.post('/api/saved')).status()).toBe(403);
    await context.close();

    const [row] =
      await sql`select banned_at, suspended_until from users where id = ${member.id}`;
    expect(row.banned_at).toBeNull();
    expect(row.suspended_until).toBeNull();
  });

  test('revoking one overlapping block keeps the other in force', async ({
    request,
  }) => {
    const [first] = await block(BLOCKED, 'first');
    const [second] = await block(BLOCKED, 'second');

    await sql`update ip_bans set revoked_at = now() where id = ${first.id}`;
    expect((await request.get('/en', from(BLOCKED))).status()).toBe(403);

    await sql`update ip_bans set revoked_at = now() where id = ${second.id}`;
    expect((await request.get('/en', from(BLOCKED))).status()).toBe(200);
  });

  test('a banned identity is denied from any ip, signed in or not', async ({
    request,
  }) => {
    const [member, other] = accounts;

    await sql`update users set banned_at = now() where id = ${member.id}`;
    for (const ip of [undefined, OTHER]) {
      const response = await request.get('/en', from(ip, withSession(member)));
      expect(response.status()).toBe(403);
      expect(await response.text()).toContain('You Have Been Banned');
      const api = await request.get(
        '/api/discovery',
        from(ip, withSession(member)),
      );
      expect(api.status()).toBe(403);
    }

    const marker = from(OTHER, {
      Cookie: `polycord_banned=${banMarkerFor(member.discordUserId)}`,
    });
    expect((await request.get('/en', marker)).status()).toBe(403);
    expect(
      (await request.get('/en', from(OTHER, withSession(other)))).status(),
    ).toBe(200);

    await sql`update users set banned_at = null where id = ${member.id}`;
    expect(
      (await request.get('/en', from(OTHER, withSession(member)))).status(),
    ).toBe(200);
    expect((await request.get('/en', marker)).status()).toBe(200);
  });

  test('a durable restriction keeps a recreated account banned', async ({
    request,
  }) => {
    const [member] = accounts;
    await sql`insert into moderation_restrictions (discord_user_id, banned_at) values (${member.discordUserId}, now())`;

    const response = await request.get('/en', from(OTHER, withSession(member)));
    expect(response.status()).toBe(403);
  });

  test('only owners manage ip blocks and every change is audited', async ({
    browser,
  }) => {
    const [member, , admin] = accounts;
    const open = async (account: Account, ip: string) => {
      const context = await browser.newContext({
        baseURL: ORIGIN,
        extraHTTPHeaders: { 'x-test-client-ip': ip, Origin: ORIGIN },
      });
      await context.addCookies([
        { name: 'polycord_session', value: sessionFor(account), url: ORIGIN },
      ]);
      return context;
    };

    const outsider = await open(member, OTHER);
    const refused = await outsider.request.post('/api/admin/ip-bans', {
      data: { ips: [BLOCKED] },
    });
    expect(refused.status()).toBe(404);
    await outsider.close();

    await sql`insert into ip_observations (discord_user_id, ip) values (${member.discordUserId}, ${BLOCKED}), (${member.discordUserId}, ${IPV6})`;
    const owner = await open(admin, OTHER);
    const observed = await owner.request.get(
      `/api/admin/ip-bans?userId=${member.id}`,
    );
    const seen = (await observed.json()).observed.map(
      (row: { ip: string }) => row.ip,
    );
    expect(seen.sort()).toEqual([IPV6, BLOCKED].sort());

    const own = await owner.request.post('/api/admin/ip-bans', {
      data: { ips: [OTHER] },
    });
    expect(own.status()).toBe(409);
    const invalid = await owner.request.post('/api/admin/ip-bans', {
      data: { ips: ['not-an-ip'] },
    });
    expect(invalid.status()).toBe(400);

    const created = await owner.request.post('/api/admin/ip-bans', {
      data: { ips: [BLOCKED], userId: member.id, reason: 'ban evasion' },
    });
    expect(created.status()).toBe(200);
    const { bans } = await created.json();
    expect(bans).toHaveLength(1);
    expect(bans[0]).toMatchObject({ ip: BLOCKED, reason: 'ban evasion' });
    expect((await owner.request.get('/en', from(BLOCKED))).status()).toBe(403);

    const revoked = await owner.request.delete('/api/admin/ip-bans', {
      data: { id: bans[0].id },
    });
    expect(revoked.status()).toBe(200);
    expect((await revoked.json()).bans).toHaveLength(0);
    expect((await owner.request.get('/en', from(BLOCKED))).status()).toBe(200);

    const audit =
      await sql`select action, note, target_user_id from moderation_actions where action in ('ip_block', 'ip_unblock') and admin_user_id = ${admin.id} order by created_at`;
    expect(audit.map((row) => row.action)).toEqual(['ip_block', 'ip_unblock']);
    expect(audit[0]).toMatchObject({
      note: 'ban evasion',
      target_user_id: member.id,
    });
    await sql`delete from moderation_actions where admin_user_id = ${admin.id}`;
    await owner.close();
  });
  test('owners block and unblock an ip from the admin dashboard', async ({
    browser,
  }) => {
    const [, , admin] = accounts;
    const context = await browser.newContext({
      baseURL: ORIGIN,
      extraHTTPHeaders: { 'x-test-client-ip': OTHER },
    });
    await context.addCookies([
      { name: 'polycord_session', value: sessionFor(admin), url: ORIGIN },
    ]);
    const page = await context.newPage();
    await page.goto('/en/admin');
    await page.getByRole('button', { name: 'IP blocks' }).click();
    await page.getByLabel('Or enter IP addresses').fill(BLOCKED);
    await page.getByLabel('Reason (optional)').fill('dashboard test');
    await page.getByRole('button', { name: 'Block 1 IP address' }).click();
    await expect(page.getByText(BLOCKED, { exact: true })).toBeVisible();
    expect(
      await sql`select 1 from ip_bans where ip = ${BLOCKED} and revoked_at is null`,
    ).toHaveLength(1);

    await page.getByRole('button', { name: `Unblock ${BLOCKED}` }).click();
    await expect(page.getByText('No IP addresses are blocked.')).toBeVisible();
    expect(
      await sql`select 1 from ip_bans where ip = ${BLOCKED} and revoked_at is null`,
    ).toHaveLength(0);
    await sql`delete from moderation_actions where admin_user_id = ${admin.id}`;
    await context.close();
  });
});
