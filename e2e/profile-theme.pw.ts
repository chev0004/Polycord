import { createHmac, randomUUID } from 'node:crypto';
import { expect, type Locator, test } from '@playwright/test';
import postgres from 'postgres';

const sky = 'rgb(193, 213, 233)';
const pink = 'rgb(249, 168, 207)';
const slate = 'rgb(70, 82, 95)';

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

test('discovery cards keep their colour when filters and sorting reorder results', async ({
  page,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const fixtures = [
    {
      colour: 'sky',
      expected: sky,
      country: 'US',
      target: 'ja',
      level: 'intermediate',
    },
    {
      colour: null,
      expected: sky,
      country: 'PK',
      target: 'ko',
      level: 'beginner',
    },
    {
      colour: 'slate',
      expected: slate,
      country: 'US',
      target: 'ja',
      level: 'beginner',
    },
    {
      colour: 'pink',
      expected: pink,
      country: 'JP',
      target: 'ja',
      level: 'beginner',
    },
  ];
  const owners =
    await sql`insert into users (discord_user_id, discord_username, display_name)
    select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Order ' || n from generate_series(1,${fixtures.length}) n returning id, display_name`;
  try {
    for (const [index, fixture] of fixtures.entries()) {
      await sql`insert into profiles (last_bumped_at,user_id,is_public,primary_language,target_language,proficiency_level,bio,tags,card_color,country)
        values (now() - make_interval(mins => ${index}),${owners[index].id},true,'en',${fixture.target},${fixture.level},'A card order fixture.',array[${prefix}],${fixture.colour},${fixture.country})`;
    }
    const scenarios = [
      ['', [0, 1, 2, 3]],
      ['&country=PK', [1]],
      ['&target=ja', [0, 2, 3]],
      ['&target=ja&level=beginner', [2, 3]],
      ['&sort=name-desc', [0, 1, 2, 3]],
      ['&sort=bumped-asc', [0, 1, 2, 3]],
    ] as const;
    for (const [query, visible] of scenarios) {
      await page.goto(`/en?tag=${prefix}${query}`);
      for (const [index, { expected }] of fixtures.entries()) {
        const card = page.locator('article').filter({
          has: page.getByRole('heading', {
            name: owners[index].display_name,
            exact: true,
          }),
        });
        if (!(visible as readonly number[]).includes(index)) {
          await expect(card).toHaveCount(0);
          continue;
        }
        expect(
          await background(card.locator(':scope > div > div').first()),
        ).toBe(expected);
      }
    }
  } finally {
    await sql`delete from users where id in ${sql(owners.map((owner) => owner.id))}`;
    await sql.end();
  }
});

test('discovery display names fill with their own banner colour on hover', async ({
  page,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const prefix = randomUUID().slice(0, 8);
  const solid = (rgb: string) => `linear-gradient(${rgb}, ${rgb})`;
  const fixtures = [
    { colour: 'pink', premium: false, fill: solid(pink) },
    { colour: 'sky', premium: false, fill: solid(sky) },
    { colour: 'blue', premium: true, fill: solid('rgb(89, 100, 242)') },
    {
      colour: 'gold',
      premium: true,
      fill: 'linear-gradient(115deg, rgb(236, 159, 10), rgb(240, 177, 51) 60%, rgb(244, 195, 92))',
    },
    {
      colour: 'custom',
      premium: true,
      fill: 'linear-gradient(115deg, rgb(255, 95, 109), rgb(255, 195, 113))',
    },
    { colour: 'pink', premium: true, accent: '#ff8800', fill: solid(pink) },
  ];
  const owners =
    await sql`insert into users (discord_user_id, discord_username, display_name)
    select ${prefix} || '-' || n, ${prefix} || '-' || n, ${prefix} || ' Hover ' || n from generate_series(1,${fixtures.length}) n returning id, display_name`;
  try {
    for (const [index, { colour, premium, accent }] of fixtures.entries()) {
      await sql`insert into profiles (last_bumped_at,user_id,is_public,primary_language,target_language,proficiency_level,bio,tags,card_color,custom_gradient_from,custom_gradient_to,accent_override)
        values (now() - make_interval(mins => ${index}),${owners[index].id},true,'en','ja','beginner','A hover fixture.',array[${prefix}],${colour},'#ff5f6d','#ffc371',${accent ?? null})`;
      if (premium)
        await sql`insert into subscriptions (user_id, stripe_customer_id, status, current_period_end) values (${owners[index].id}, ${`${prefix}-${index}`}, 'active', now() + interval '1 day')`;
    }
    const paint = (locator: Locator) =>
      locator.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          color: style.color,
          clip: style.backgroundClip,
          fill: style.backgroundImage,
        };
      });
    const nameOf = (index: number) =>
      page.getByRole('button', {
        name: owners[index].display_name,
        exact: true,
      });
    for (const query of ['', '&sort=name-desc']) {
      await page.goto(`/en?tag=${prefix}${query}`);
      for (const [index, { fill }] of fixtures.entries()) {
        const card = page.locator('article').filter({ has: nameOf(index) });
        await expect(async () => {
          await card.hover({ position: { x: 20, y: 150 } });
          expect(await paint(nameOf(index))).toEqual({
            color: 'rgba(0, 0, 0, 0)',
            clip: 'text',
            fill,
          });
        }).toPass();
      }
      await page.mouse.move(0, 0);
      await expect(async () => {
        expect(await paint(nameOf(0))).toEqual({
          color: 'rgb(255, 255, 255)',
          clip: 'border-box',
          fill: 'none',
        });
      }).toPass();
    }
  } finally {
    await sql`delete from users where id in ${sql(owners.map((owner) => owner.id))}`;
    await sql.end();
  }
});

test('the progress bar follows the signed-in member profile colour', async ({
  page,
  context,
}) => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string);
  const id = randomUUID().replaceAll('-', '').slice(0, 24);
  const [owner, other] =
    await sql`insert into users (discord_user_id, discord_username, display_name)
    values (${id}, ${id}, 'Progress owner'), (${`${id}-other`}, ${`${id}-other`}, 'Progress other') returning id`;
  try {
    await sql`insert into profiles (user_id,is_public,primary_language,target_language,proficiency_level,bio,tags,card_color,timezone)
      values (${owner.id},true,'en','ja','beginner','A progress colour fixture.',array['Cooking'],'pink','Asia/Tokyo'),
      (${other.id},true,'en','ja','beginner','Another progress colour fixture.',array['Cooking'],'slate','Asia/Tokyo')`;
    const [otherProfile] =
      await sql`select id from profiles where user_id=${other.id}`;
    const payload = Buffer.from(
      JSON.stringify({
        user: { id, accountId: owner.id, name: 'Progress owner', username: id },
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
    const bar = page.locator('div.fixed.top-0.h-1');

    await page.goto('/en');
    await expect(bar).toHaveCSS('background-color', pink);
    await page.goto(`/en/u/${otherProfile.id}`);
    await expect(bar).toHaveCSS('background-color', pink);

    await page.goto('/en/profile');
    const slateSwatch = page.getByRole('button', {
      name: 'Slate banner colour',
      exact: true,
    });
    await expect(async () => {
      await slateSwatch.click();
      await expect(slateSwatch).toHaveAttribute('aria-pressed', 'true', {
        timeout: 1000,
      });
    }).toPass();
    await page
      .getByRole('button', { name: 'Save Profile', exact: true })
      .click();
    await expect(bar).toHaveCSS('background-color', slate);
    await page.getByRole('button', { name: 'Polycord', exact: true }).click();
    await expect(page).toHaveURL('/en');
    await expect(bar).toHaveCSS('background-color', slate);

    await sql`insert into subscriptions (user_id, stripe_customer_id, status, current_period_end) values (${owner.id}, ${id}, 'active', now() + interval '1 day')`;
    await sql`update profiles set card_color='custom', custom_gradient_from='#ff5f6d', custom_gradient_to='#ffc371' where user_id=${owner.id}`;
    await page.reload();
    await expect(bar).toHaveCSS(
      'background-image',
      'linear-gradient(115deg, rgb(255, 95, 109), rgb(255, 195, 113))',
    );
  } finally {
    await sql`delete from users where id in ${sql([owner.id, other.id])}`;
    await sql.end();
  }
});
