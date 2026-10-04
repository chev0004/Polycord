import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test.skipIf(!process.env.TEST_DATABASE_URL)(
  'warning notices stay pending until acknowledged and the acknowledgement is stored',
  () => {
    expect(
      execFileSync(
        process.execPath,
        ['run', 'tests/integration/warning-notice.mjs'],
        {
          encoding: 'utf8',
          timeout: 30000,
        },
      ),
    ).toContain('warning notice acknowledgement passed');
  },
  30000,
);
