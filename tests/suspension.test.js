import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test('suspended accounts cannot sign in or keep a session until the suspension ends', () => {
  expect(
    execFileSync(
      process.execPath,
      ['run', 'tests/integration/suspension.mjs'],
      {
        encoding: 'utf8',
        timeout: 30000,
      },
    ),
  ).toContain('suspension sign-in cases passed');
});
