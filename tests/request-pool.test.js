import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test('early-returning and failing handlers await prewarmed connection cleanup', () => {
  expect(
    execFileSync(
      process.execPath,
      ['run', 'tests/integration/request-pool-cleanup.mjs'],
      { encoding: 'utf8', timeout: 10000 },
    ),
  ).toContain('early request pool cleanup passed');
});

test.skipIf(!process.env.TEST_DATABASE_URL)(
  'request pools reuse connections, close on failure and leave nothing open after a burst',
  () => {
    expect(
      execFileSync(
        process.execPath,
        ['run', 'tests/integration/request-pool.mjs'],
        {
          encoding: 'utf8',
          timeout: 30000,
        },
      ),
    ).toContain('request pool passed');
  },
);
