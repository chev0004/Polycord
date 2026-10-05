import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test.skipIf(!process.env.TEST_DATABASE_URL)(
  'stalled ban lookups time out without holding the connection pool',
  () => {
    expect(
      execFileSync(
        process.execPath,
        ['run', 'tests/integration/ban-lookup.mjs'],
        {
          encoding: 'utf8',
          timeout: 60000,
        },
      ),
    ).toContain('ban lookup recovery passed');
  },
  60000,
);
