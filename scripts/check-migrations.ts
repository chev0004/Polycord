import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import journal from '../drizzle/meta/_journal.json';
import history from './migration-history.json';

type Migration = { tag: string; when: number; hash: string };
type Recorded = { hash: string; createdAt: number };
type History = {
  recordedAs: Record<string, string>;
  superseded: Record<string, string>;
};

export const migrationProblems = (
  migrations: Migration[],
  recorded: Recorded[],
  { recordedAs, superseded }: History,
) => {
  const latest = Math.max(0, ...recorded.map(({ createdAt }) => createdAt));
  const applied = (migration: Migration) =>
    recorded.some(
      ({ hash, createdAt }) =>
        (hash === migration.hash && createdAt === migration.when) ||
        hash === recordedAs[migration.tag],
    );
  const unapplied = migrations.filter((migration) => !applied(migration));
  const known = new Set([
    ...migrations.map(({ hash }) => hash),
    ...Object.values(recordedAs),
    ...Object.keys(superseded),
  ]);
  return {
    pending: unapplied
      .filter(({ when }) => when > latest)
      .map(({ tag }) => tag),
    missing: unapplied
      .filter(({ when }) => when <= latest)
      .map(({ tag }) => tag),
    unexpected: recorded
      .filter(({ hash }) => !known.has(hash))
      .map(({ hash, createdAt }) => `${hash.slice(0, 12)} at ${createdAt}`),
  };
};

if (import.meta.main) {
  const migrations = journal.entries.map(({ tag, when }) => ({
    tag,
    when,
    hash: createHash('sha256')
      .update(readFileSync(`drizzle/${tag}.sql`, 'utf8'))
      .digest('hex'),
  }));
  const sql = postgres(process.env.DATABASE_URL as string, {
    prepare: false,
    max: 1,
  });
  const [{ table }] =
    await sql`select to_regclass('drizzle.__drizzle_migrations') as table`;
  const recorded = table
    ? (
        await sql`select hash, created_at from drizzle.__drizzle_migrations`
      ).map(({ hash, created_at }) => ({ hash, createdAt: Number(created_at) }))
    : [];
  await sql.end();

  const { pending, missing, unexpected } = migrationProblems(
    migrations,
    recorded,
    history,
  );
  if (pending.length)
    console.error(
      `migrations: ${pending.length} pending (${pending.join(', ')}). Apply them with bun run db:migrate.`,
    );
  if (missing.length)
    console.error(
      `migrations: ${missing.length} missing before the latest recorded migration (${missing.join(', ')}). db:migrate skips these; reconcile them using docs/operations/readiness.md#migration-history.`,
    );
  if (unexpected.length)
    console.error(
      `migrations: ${unexpected.length} recorded migrations match no file (${unexpected.join(', ')}). Reconcile them using docs/operations/readiness.md#migration-history.`,
    );
  if (pending.length || missing.length || unexpected.length) process.exit(1);
  console.log(`migrations: database is current (${migrations.length}).`);
}
