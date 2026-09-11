import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test.skipIf(!process.env.TEST_DATABASE_URL)(
  'moderation survives deletion and pending reports remain reachable',
  () => {
    expect(
      execFileSync(
        process.execPath,
        ['run', 'tests/integration/moderation.mjs'],
        {
          encoding: 'utf8',
          timeout: 30000,
        },
      ),
    ).toContain('moderation lifecycle passed');
  },
);
