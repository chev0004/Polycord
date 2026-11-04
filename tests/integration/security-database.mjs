import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

const url = new URL(process.env.TEST_DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
const sql = postgres(url.href, { max: 1, onnotice: () => {} });
const apiRoles = ['anon', 'authenticated'];
const rollback = new Error('rollback');

const rejected = async (tx, run) => {
  try {
    await tx.savepoint(run);
  } catch (error) {
    return error.code;
  }
  return null;
};

try {
  const tables = await sql`
    select c.relname as name, c.relrowsecurity as rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by 1`;
  assert.ok(tables.length >= 22);
  assert.deepEqual(
    tables.filter(({ rls }) => !rls).map(({ name }) => name),
    [],
  );

  await sql
    .begin(async (tx) => {
      for (const role of apiRoles) {
        const [{ exists }] =
          await tx`select exists (select 1 from pg_roles where rolname = ${role})`;
        if (!exists) await tx.unsafe(`create role ${role} nologin`);
        await tx.unsafe(
          `grant usage on schema public to ${role}; grant all on all tables in schema public to ${role}; grant all on all sequences in schema public to ${role}`,
        );
      }
      const discordUserId = `rls-${randomUUID().slice(0, 28)}`;
      const [{ id }] = await tx`
        insert into users (discord_user_id, discord_username, display_name, email, banned_at)
        values (${discordUserId}, 'rls_probe', 'RLS probe', 'probe@example.com', now())
        returning id`;
      await tx`
        insert into moderation_restrictions (discord_user_id, banned_at)
        values (${discordUserId}, now())`;

      for (const role of apiRoles) {
        await tx.unsafe(`set local role ${role}`);
        for (const { name } of tables) {
          const [{ count }] = await tx.unsafe(
            `select count(*)::int as count from public."${name}"`,
          );
          assert.equal(count, 0, `${role} can read ${name}`);
        }
        assert.equal(
          await rejected(
            tx,
            (sp) => sp`insert into staff_roles (user_id) values (${id})`,
          ),
          '42501',
        );
        assert.equal(
          await rejected(
            tx,
            (sp) =>
              sp`insert into users (discord_user_id, discord_username, display_name) values (${randomUUID().slice(0, 32)}, 'forged', 'Forged')`,
          ),
          '42501',
        );
        assert.equal(
          (await tx`update users set banned_at = null where id = ${id}`).count,
          0,
        );
        assert.equal(
          (
            await tx`delete from moderation_restrictions where discord_user_id = ${discordUserId}`
          ).count,
          0,
        );
        await tx`reset role`;
      }

      const [{ staff, banned, restricted }] = await tx`
        select
          (select count(*)::int from staff_roles where user_id = ${id}) as staff,
          (select banned_at is not null from users where id = ${id}) as banned,
          (select count(*)::int from moderation_restrictions where discord_user_id = ${discordUserId}) as restricted`;
      assert.deepEqual(
        { staff, banned, restricted },
        {
          staff: 0,
          banned: true,
          restricted: 1,
        },
      );
      throw rollback;
    })
    .catch((error) => {
      if (error !== rollback) throw error;
    });

  console.log('database security passed');
} finally {
  await sql.end();
}
