import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test.skipIf(!process.env.TEST_DATABASE_URL)(
  'push delivery respects preferences and removes expired subscriptions',
  () => {
    expect(
      execFileSync(
        process.execPath,
        ['run', 'tests/integration/push-delivery.mjs'],
        {
          encoding: 'utf8',
          timeout: 30000,
        },
      ),
    ).toContain('push delivery passed');
  },
);
