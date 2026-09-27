import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test.skipIf(!process.env.TEST_DATABASE_URL)(
  'dummy seeding is gated and converges on the requested total',
  () => {
    expect(
      execFileSync(process.execPath, ['run', 'tests/integration/seed.mjs'], {
        encoding: 'utf8',
        timeout: 120000,
      }),
    ).toContain('seed lifecycle passed');
  },
  120000,
);
