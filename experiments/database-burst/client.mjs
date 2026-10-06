import pg from 'pg';
import postgres from 'postgres';
import ca from '../../src/db/supabaseCa.json' with { type: 'json' };
import { sandboxResource } from './resources.mjs';

export const createClient = (driver, connectionString) => {
  const max = Number(process.env.PROBE_POOL_SIZE ?? 1);
  sandboxResource(connectionString);
  if (driver === 'postgres' || driver === 'postgres-serial') {
    const client = postgres(connectionString, {
      prepare: false,
      max,
      ssl: { ca, rejectUnauthorized: true },
      connect_timeout: 3,
      idle_timeout: 20,
      ...(driver === 'postgres-serial' && { max_pipeline: 1 }),
    });
    return {
      query: (text, values = []) => client.unsafe(text, values),
      transaction: (run) =>
        client.begin((tx) =>
          run((text, values = []) => tx.unsafe(text, values)),
        ),
      close: () => client.end({ timeout: 0 }),
    };
  }
  if (driver !== 'pg') throw new Error('Unknown driver');
  const pool = new pg.Pool({
    connectionString,
    ssl: { ca, rejectUnauthorized: true },
    max,
    connectionTimeoutMillis: 3000,
    query_timeout: 2500,
    idleTimeoutMillis: 20000,
  });
  pool.on('error', () => {});
  const query = async (text, values = []) =>
    (await pool.query(text, values)).rows;
  return {
    query,
    transaction: async (run) => {
      const client = await pool.connect();
      let failed = false;
      try {
        await client.query('begin');
        const result = await run(
          async (text, values = []) => (await client.query(text, values)).rows,
        );
        await client.query('commit');
        return result;
      } catch (error) {
        failed = true;
        throw error;
      } finally {
        client.release(failed);
      }
    },
    close: () => pool.end(),
  };
};

export const workload = async (client, kind) => {
  if (kind === 'discovery') {
    return client.query(
      'select p.id,u.display_name,p.tags from profiles p join users u on u.id=p.user_id where p.is_public and p.last_bumped_at is not null and u.banned_at is null order by p.last_bumped_at desc,p.id limit 9',
    );
  }
  if (kind === 'page') {
    return client.query(
      'select count(*)::int as total from profiles p join users u on u.id=p.user_id where p.is_public and u.banned_at is null',
    );
  }
  return client.transaction(async (query) => {
    await query("select set_config('statement_timeout','2500',true)");
    const rows = await Promise.all([
      query('select banned_at from users where discord_user_id=$1', [
        'test006-allowed',
      ]),
      query(
        'select banned_at from moderation_restrictions where discord_user_id=$1',
        ['test006-allowed'],
      ),
      query('select id from ip_bans where ip=$1 and revoked_at is null', [
        '203.0.113.250',
      ]),
    ]);
    return rows.flat();
  });
};
