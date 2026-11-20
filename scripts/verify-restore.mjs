import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const criticalTables = new Set([
  'users',
  'profiles',
  'profile_target_languages',
  'user_settings',
  'staff_roles',
  'reports',
  'moderation_actions',
  'moderation_restrictions',
  'ip_bans',
]);
const identifier = (name) => `"${name.replaceAll('"', '""')}"`;

export async function snapshot(url) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('begin isolation level repeatable read read only');
    await client.query("set local time zone 'UTC'");
    await client.query('set local search_path = public, pg_catalog');
    const { rows } = await client.query(
      "select tablename from pg_tables where schemaname = 'public' order by tablename",
    );
    const tables = {};
    const contents = {};
    for (const { tablename } of rows) {
      const table = `public.${identifier(tablename)}`;
      tables[tablename] = (
        await client.query(`select count(*)::int as count from ${table}`)
      ).rows[0].count;
      if (criticalTables.has(tablename)) {
        const { rows: digests } = await client.query(
          `select sha256(convert_to(to_jsonb(record)::text, 'UTF8')) as digest from ${table} record order by digest`,
        );
        const hash = createHash('sha256');
        for (const { digest } of digests) hash.update(digest);
        contents[tablename] = hash.digest('hex');
      }
    }
    const { rows: constraints } = await client.query(`
      select relation.relname as table, con.conname as name,
        pg_get_constraintdef(con.oid) as definition, con.convalidated as validated
      from pg_constraint con join pg_class relation on relation.oid = con.conrelid
      where relation.relnamespace = 'public'::regnamespace
      order by relation.relname, con.conname
    `);
    const migrations = (
      await client.query(
        'select hash, created_at from drizzle.__drizzle_migrations order by created_at, hash',
      )
    ).rows.map(({ hash, created_at }) => `${hash}:${created_at}`);
    await client.query('commit');
    return { tables, migrations, contents, constraints };
  } finally {
    await client.end();
  }
}

export function differences(expected, actual) {
  const names = new Set([
    ...Object.keys(expected.tables),
    ...Object.keys(actual.tables),
  ]);
  const found = [...names]
    .filter((name) => expected.tables[name] !== actual.tables[name])
    .map(
      (name) =>
        `${name}: expected ${expected.tables[name] ?? 'no table'}, found ${actual.tables[name] ?? 'no table'}`,
    );
  if (expected.migrations.join() !== actual.migrations.join())
    found.push(
      `migrations: expected ${expected.migrations.length}, found ${actual.migrations.length} or a different history`,
    );
  if (!expected.contents || !expected.constraints)
    found.push(
      'Snapshot lacks row digests or constraint definitions. Take a new snapshot.',
    );
  else {
    for (const name of Object.keys(expected.contents))
      if (expected.contents[name] !== actual.contents?.[name])
        found.push(`${name}: row contents differ`);
    if (
      JSON.stringify(expected.constraints) !==
      JSON.stringify(actual.constraints)
    )
      found.push('Public constraints differ');
  }
  return found;
}

if (import.meta.main) {
  const [mode, url, file] = process.argv.slice(2);
  if (mode === 'snapshot') console.log(JSON.stringify(await snapshot(url)));
  else if (mode === 'verify') {
    const found = differences(
      JSON.parse(await readFile(file, 'utf8')),
      await snapshot(url),
    );
    console.log(
      found.length ? found.join('\n') : 'Restore matches the snapshot.',
    );
    if (found.length) process.exitCode = 1;
  } else {
    console.error(
      'Usage: verify-restore.mjs snapshot <url> | verify <url> <snapshot.json>',
    );
    process.exitCode = 1;
  }
}
