import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test.skipIf(!process.env.TEST_DATABASE_URL)(
  'copy history survives deleting and clearing notifications',
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
    ).toContain('copy history passed');
  },
);
