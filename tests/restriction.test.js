import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test('restricted accounts cannot sign in or keep a session while suspended or banned', () => {
  expect(
    execFileSync(
      process.execPath,
      ['run', 'tests/integration/restriction.mjs'],
      {
        encoding: 'utf8',
        timeout: 30000,
      },
    ),
  ).toContain('restricted sign-in cases passed');
});
