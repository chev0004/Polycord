import postgres from 'postgres';
import journal from '../drizzle/meta/_journal.json';

const sql = postgres(process.env.DATABASE_URL as string, {
  prepare: false,
  max: 1,
});
const [{ latest }] =
  await sql`select coalesce(max(created_at), 0) as latest from drizzle.__drizzle_migrations`;
await sql.end();

const pending = journal.entries.filter(({ when }) => when > Number(latest));

if (pending.length > 0) {
  console.error(
    `migrations: ${pending.length} pending (${pending.map(({ tag }) => tag).join(', ')})`,
  );
  console.error('Apply them with bun run db:migrate before deploying.\n');
  process.exit(1);
} else {
  console.log(`migrations: database is current (${journal.entries.length}).`);
}
