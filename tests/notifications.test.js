import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test.skipIf(!process.env.TEST_DATABASE_URL)(
  'notification privacy, preferences, identity and ownership are enforced',
  () => {
    expect(
      execFileSync(
        process.execPath,
        ['run', 'tests/integration/notifications.mjs'],
        {
          encoding: 'utf8',
          timeout: 30000,
        },
      ),
    ).toContain('notification boundaries passed');
  },
);
