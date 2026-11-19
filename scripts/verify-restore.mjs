import { readFile } from 'node:fs/promises';
import pg from 'pg';

export async function snapshot(url) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query(
      "select tablename from pg_tables where schemaname = 'public' order by tablename",
    );
    const tables = {};
    for (const { tablename } of rows)
      tables[tablename] = (
        await client.query(
          `select count(*)::int as count from public."${tablename}"`,
        )
      ).rows[0].count;
    const migrations = (
      await client.query(
        'select hash from drizzle.__drizzle_migrations order by created_at',
      )
    ).rows.map(({ hash }) => hash);
    return { tables, migrations };
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
