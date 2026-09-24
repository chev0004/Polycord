import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test.skipIf(!process.env.TEST_DATABASE_URL)(
  'analytics honors the opt-out and unlinks events on account deletion',
  () => {
    expect(
      execFileSync(
        process.execPath,
        ['run', 'tests/integration/analytics.mjs'],
        {
          encoding: 'utf8',
          timeout: 30000,
        },
      ),
    ).toContain('analytics consent passed');
  },
);
