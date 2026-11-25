import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import history from '../scripts/migration-history.json';

const check = (url) =>
  spawnSync(process.execPath, ['scripts/check-migrations.ts'], {
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: url },
  });

test.skipIf(!process.env.TEST_DATABASE_URL)(
  'the deploy gate checks the full migration history',
  async () => {
    const server = new URL(process.env.TEST_DATABASE_URL);
    expect(['localhost', '127.0.0.1']).toContain(server.hostname);
    const name = `polycord_migrations_${randomUUID().replaceAll('-', '')}`;
    const admin = new pg.Client({ connectionString: server.href });
    await admin.connect();
    await admin.query(`create database ${name}`);
    const url = new URL(server.href);
    url.pathname = `/${name}`;
    const pool = new pg.Pool({ connectionString: url.href, max: 1 });
    try {
      const empty = check(url.href);
      expect(empty.status).toBe(1);
      expect(empty.stderr).toContain('pending (0000_profile_001,');

      await migrate(drizzle(pool), { migrationsFolder: 'drizzle' });
      expect(check(url.href).stdout).toContain('database is current');

      const { rows: recorded } = await pool.query(
        'select id, hash, created_at from drizzle.__drizzle_migrations order by created_at',
      );
      for (const [index, tag] of [
        [1, '0001_onboarding_profile_fields'],
        [9, '0009_ambitious_landau'],
        [10, '0010_curvy_shard'],
      ]) {
        const { hash, createdAt } = history.recordedAs[tag];
        await pool.query(
          'update drizzle.__drizzle_migrations set hash = $1, created_at = $2 where id = $3',
          [hash, createdAt, recorded[index].id],
        );
      }
      for (const [hash, { createdAt }] of Object.entries(history.superseded))
        await pool.query(
          'insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)',
          [hash, createdAt],
        );
      expect(check(url.href).stdout).toContain('database is current');

      const insert =
        'insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2) returning id';
      const latest = recorded.at(-1);
      for (const [hash, when] of [
        [latest.hash, Number(latest.created_at) + 1000],
        [latest.hash, latest.created_at],
        [
          history.recordedAs['0001_onboarding_profile_fields'].hash,
          1780767467907,
        ],
        [Object.keys(history.superseded)[0], 1783532556610],
      ]) {
        const {
          rows: [row],
        } = await pool.query(insert, [hash, when]);
        const result = check(url.href);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain(`${hash.slice(0, 12)} at ${when}`);
        await pool.query(
          'delete from drizzle.__drizzle_migrations where id = $1',
          [row.id],
        );
      }

      await pool.query(
        'delete from drizzle.__drizzle_migrations where id = $1',
        [recorded[5].id],
      );
      const missing = check(url.href);
      expect(missing.status).toBe(1);
      expect(missing.stderr).toContain(
        '1 missing before the latest recorded migration (0005_cool_stryfe)',
      );

      await pool.query(
        "insert into drizzle.__drizzle_migrations (hash, created_at) values ('0123456789abcdef', 1)",
      );
      expect(check(url.href).stderr).toContain(
        '1 recorded migrations match no file (0123456789ab at 1)',
      );
    } finally {
      await pool.end();
      await admin.query(`drop database ${name}`);
      await admin.end();
    }
  },
  60000,
);
