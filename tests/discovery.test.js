import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test.skipIf(!process.env.TEST_DATABASE_URL)(
  'discovery bounds results and respects viewer privacy',
  () => {
    const output = execFileSync(
      process.execPath,
      ['run', 'tests/integration/discovery.mjs'],
      { encoding: 'utf8', timeout: 30000 },
    );
    expect(output).toContain(
      'discovery pagination, filters and privacy passed',
    );
  },
);
