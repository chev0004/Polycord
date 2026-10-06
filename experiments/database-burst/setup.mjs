import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { count, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import ca from '../../src/db/supabaseCa.json' with { type: 'json' };
import { sandboxResource } from './resources.mjs';

const url = new URL(process.env.DATABASE_URL);
sandboxResource(url.href);
const client = postgres(url.href, {
  prepare: false,
  max: 1,
  ssl: { ca, rejectUnauthorized: true },
  connect_timeout: 3,
});
await migrate(drizzle(client), { migrationsFolder: './drizzle' });
await client.end({ timeout: 0 });
mock.module('server-only', () => ({}));
const { db } = await import('../../src/db/client');
const { addDummies } = await import('../../src/db/seed');
const { users, profiles, moderationRestrictions, ipBans } = await import(
  '../../src/db/schema'
);
await db
  .delete(users)
  .where(inArray(users.discordUserId, ['test006-allowed', 'test006-banned']));
let [{ total }] = await db.select({ total: count() }).from(profiles);
while (total < 5000) {
  await addDummies(5000 - total);
  [{ total }] = await db.select({ total: count() }).from(profiles);
}
assert.equal(total, 5000);
await db.insert(users).values([
  {
    discordUserId: 'test006-allowed',
    discordUsername: 'test006-allowed',
    displayName: 'Test Allowed',
    isSynthetic: true,
  },
  {
    discordUserId: 'test006-banned',
    discordUsername: 'test006-banned',
    displayName: 'Test Banned',
    isSynthetic: true,
    bannedAt: new Date(),
  },
]);
await db
  .insert(moderationRestrictions)
  .values({ discordUserId: 'test006-remembered', bannedAt: new Date() })
  .onConflictDoNothing();
await db.delete(ipBans).where(eq(ipBans.ip, '203.0.113.250'));
await db
  .insert(ipBans)
  .values({ ip: '203.0.113.250', reason: 'TEST-006 synthetic fixture' });
console.log('TEST-006 migrated and seeded 5000 synthetic profiles');
await db.$client.end();
