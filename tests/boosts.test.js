import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test.skipIf(!process.env.TEST_DATABASE_URL)(
  'one remaining boost is consumed atomically',
  () => {
    const output = execFileSync(
      process.execPath,
      ['run', 'tests/integration/boosts.mjs'],
      {
        encoding: 'utf8',
        timeout: 30000,
      },
    );
    expect(output).toContain('boost concurrency passed');
  },
);
