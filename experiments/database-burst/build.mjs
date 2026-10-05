import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { sandboxResource } from './resources.mjs';

const resource = sandboxResource(process.env.DATABASE_URL);
assert.equal(process.env.SITE_ID, resource.id);
for (const name of ['DATABASE_URL', 'SESSION_DATABASE_URL']) {
  assert.equal(sandboxResource(process.env[name]), resource);
}
assert.equal(new URL(process.env.DATABASE_URL).port, '6543');
assert.equal(new URL(process.env.SESSION_DATABASE_URL).port, '5432');
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
