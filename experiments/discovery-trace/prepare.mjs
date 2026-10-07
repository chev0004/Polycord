import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import postgres from 'postgres';
import ca from '../../src/db/supabaseCa.json' with { type: 'json' };
import { createSessionCookieValue } from '../../src/lib/auth-session';
import {
  sandboxOrigin,
  sandboxResource,
} from '../database-burst/resources.mjs';

const [origin, output] = process.argv.slice(2);
const resource = sandboxResource(process.env.SESSION_DATABASE_URL);
assert.equal(resource.project, 'vioatoyjsfzqrpohliaa');
sandboxOrigin(origin, resource, true);
const db = postgres(process.env.SESSION_DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: { ca, rejectUnauthorized: true },
  connect_timeout: 3,
});
try {
  const [fixture] = await db`select count(*)::int as profiles,
    count(*) filter(where not u.is_synthetic)::int as real_profiles,
    count(*) filter(where p.is_public and not p.hidden_by_moderation and p.last_bumped_at is not null and u.banned_at is null and (u.suspended_until is null or u.suspended_until < now()))::int as discoverable
    from profiles p join users u on u.id=p.user_id`;
  assert.deepEqual(fixture, {
    profiles: 5000,
    real_profiles: 0,
    discoverable: 4735,
  });
  const [account] =
    await db`select id from users where discord_user_id='test006-allowed'`;
  const cookie = await createSessionCookieValue(
    { id: 'test006-allowed', name: 'TEST-006', username: 'test006-allowed' },
    account.id,
  );
  const payloads = {};
  for (const [key, path] of [
    ['viewer', '/api/discovery/viewer?locale=en'],
    ['discovery', '/api/discovery?locale=en'],
  ]) {
    const response = await fetch(origin + path, {
      headers: { cookie: `polycord_session=${cookie}` },
      signal: AbortSignal.timeout(25000),
    });
    assert.equal(response.status, 200);
    payloads[key] = await response.json();
  }
  assert.equal(payloads.viewer.isLoggedIn, true);
  assert.equal(payloads.discovery.total, 4735);
  await writeFile(output, JSON.stringify(payloads));
  const [version] = await db`select version() as version`;
  console.log(
    JSON.stringify({
      at: new Date().toISOString(),
      fixture,
      version: version.version.split(' on ')[0],
      output,
    }),
  );
} finally {
  await db.end({ timeout: 0 });
}
