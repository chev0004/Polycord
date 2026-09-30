import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test.skipIf(!process.env.TEST_DATABASE_URL)(
  'received profile stats count views and copies',
  () => {
    expect(
      execFileSync(
        process.execPath,
        ['run', 'tests/integration/profile-stats.mjs'],
        {
          encoding: 'utf8',
          timeout: 30000,
        },
      ),
    ).toContain('received views passed');
  },
);
