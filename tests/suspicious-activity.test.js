import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test.skipIf(!process.env.TEST_DATABASE_URL)(
  'suspicious activity is grouped per user before limiting',
  () => {
    expect(
      execFileSync(
        process.execPath,
        ['run', 'tests/integration/suspicious-activity.mjs'],
        { encoding: 'utf8', timeout: 30000 },
      ),
    ).toContain('suspicious activity grouping passed');
  },
);
