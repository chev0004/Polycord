import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test.skipIf(!process.env.TEST_DATABASE_URL)(
  'privacy and mutual blocks protect profile queries and interactions',
  () => {
    expect(
      execFileSync(process.execPath, ['run', 'tests/integration/safety.mjs'], {
        encoding: 'utf8',
        timeout: 30000,
      }),
    ).toContain('safety checks passed');
  },
);
