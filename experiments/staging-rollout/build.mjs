import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

assert.equal(process.env.SITE_ID, '694f7324-d2b5-43b5-9de4-ae33e0b927ee');
const url = new URL(process.env.DATABASE_URL);
assert.equal(url.username, 'postgres.lqyekuxzhxkjsctdpybi');
assert.equal(url.hostname, 'aws-1-us-west-2.pooler.supabase.com');
assert.equal(url.pathname, '/postgres');
console.log(
  JSON.stringify({
    site: process.env.SITE_ID,
    commit: process.env.COMMIT_REF,
    database: 'lqyekuxzhxkjsctdpybi',
    endpoint: url.hostname,
    port: url.port,
    fingerprint: createHash('sha256')
      .update(process.env.DATABASE_URL)
      .digest('hex'),
    node: process.version,
  }),
);
if (process.env.DEV017_INSPECT_ONLY === 'true') process.exit(1);
assert.equal(url.port, '6543');
execFileSync('bun', ['--no-env-file', 'scripts/check-migrations.ts'], {
  stdio: 'inherit',
});
execFileSync('bun', ['run', 'build'], { stdio: 'inherit' });
