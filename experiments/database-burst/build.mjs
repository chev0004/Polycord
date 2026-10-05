import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

assert.equal(process.env.SITE_ID, '69325f10-4cec-4ed6-a390-7a6392a48470');
for (const name of ['DATABASE_URL', 'SESSION_DATABASE_URL']) {
  const url = new URL(process.env[name]);
  assert.equal(url.username, 'postgres.ftlxjximfprlplbihcph');
  assert.equal(url.hostname, 'aws-0-us-east-2.pooler.supabase.com');
  assert.equal(url.pathname, '/postgres');
}
const run = (command, args) =>
  execFileSync(command, args, { stdio: 'inherit' });
const origin = process.env.TEST006_DEPLOY_ORIGIN;
if (origin) {
  run('bun', [
    '--no-env-file',
    'experiments/database-burst/run-app.mjs',
    origin,
    '/tmp/test006-first-traffic.json',
  ]);
  run('bun', [
    '--no-env-file',
    'experiments/database-burst/run-faults.mjs',
    origin,
    'locked',
    '/tmp/test006-locked.json',
  ]);
} else {
  run('node', ['experiments/database-burst/verify-local.mjs']);
  run('bun', ['--no-env-file', 'experiments/database-burst/setup.mjs']);
}
run('bun', ['--no-env-file', 'scripts/check-migrations.ts']);
run('bun', ['run', 'build']);
