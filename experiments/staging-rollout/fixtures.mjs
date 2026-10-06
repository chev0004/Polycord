import assert from 'node:assert/strict';
import postgres from 'postgres';
import ca from '../../src/db/supabaseCa.json' with { type: 'json' };

const url = new URL(process.env.SESSION_DATABASE_URL);
assert.equal(url.username, 'postgres.lqyekuxzhxkjsctdpybi');
assert.equal(url.hostname, 'aws-1-us-west-2.pooler.supabase.com');
assert.equal(url.port, '5432');
const sql = postgres(url.href, {
  prepare: false,
  max: 1,
  ssl: { ca, rejectUnauthorized: true },
  connect_timeout: 3,
  statement_timeout: 3000,
});
try {
  await sql.begin(async (tx) => {
    if (process.argv[2] === 'cleanup') {
      await tx`delete from ip_bans where target_discord_user_id='dev017-allowed' and reason='DEV-017 fixture'`;
      await tx`delete from moderation_restrictions where discord_user_id='dev017-remembered'`;
      await tx`delete from users where discord_user_id in ('dev017-allowed','dev017-banned') and is_synthetic`;
    } else {
      assert.equal(process.argv[2], 'setup');
      const [existing] = await tx`select
        (select count(*) from users where discord_user_id in ('dev017-allowed','dev017-banned')) +
        (select count(*) from moderation_restrictions where discord_user_id='dev017-remembered') +
        (select count(*) from ip_bans where ip='203.0.113.249') as total`;
      assert.equal(Number(existing.total), 0);
      await tx`insert into users (discord_user_id,discord_username,display_name,is_synthetic,banned_at)
        values ('dev017-allowed','dev017-allowed','DEV-017 Allowed',true,null),
        ('dev017-banned','dev017-banned','DEV-017 Banned',true,now())`;
      await tx`insert into moderation_restrictions (discord_user_id,banned_at) values ('dev017-remembered',now())`;
      await tx`insert into ip_bans (ip,target_discord_user_id,reason) values ('203.0.113.249','dev017-allowed','DEV-017 fixture')`;
    }
  });
  console.log(`DEV-017 fixture ${process.argv[2]} complete`);
} finally {
  await sql.end({ timeout: 0 });
}
