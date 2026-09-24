import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test.skipIf(!process.env.TEST_DATABASE_URL)(
  'account export and deletion preserve the documented data boundaries',
  () => {
    expect(
      execFileSync(process.execPath, ['run', 'tests/integration/account.mjs'], {
        encoding: 'utf8',
        timeout: 30000,
      }),
    ).toContain('account lifecycle passed');
  },
);
