import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { sandboxResource } from '../database-burst/resources.mjs';

const resource = sandboxResource(process.env.DATABASE_URL);
assert.equal(resource.project, 'vioatoyjsfzqrpohliaa');
assert.equal(process.env.SITE_ID, resource.id);
assert.equal(sandboxResource(process.env.SESSION_DATABASE_URL), resource);
assert.equal(new URL(process.env.DATABASE_URL).port, '6543');
assert.equal(new URL(process.env.SESSION_DATABASE_URL).port, '5432');
execFileSync('bun', ['--no-env-file', 'scripts/check-migrations.ts'], {
  stdio: 'inherit',
});
execFileSync('bun', ['run', 'build'], { stdio: 'inherit' });
