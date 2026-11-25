import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test('logout refreshes to the relative locale path without a redirect', () => {
  expect(
    execFileSync(process.execPath, ['run', 'tests/integration/logout.mjs'], {
      encoding: 'utf8',
      timeout: 30000,
    }),
  ).toContain('logout cases passed');
});
