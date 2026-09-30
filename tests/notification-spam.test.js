import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test.skipIf(!process.env.TEST_DATABASE_URL)(
  'repeated and alternating profile interactions cannot flood an owner',
  () => {
    expect(
      execFileSync(
        process.execPath,
        ['run', 'tests/integration/notification-spam.mjs'],
        {
          encoding: 'utf8',
          timeout: 30000,
        },
      ),
    ).toContain('notification spam protection passed');
  },
);
