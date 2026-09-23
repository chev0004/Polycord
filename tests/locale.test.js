import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test('sign-in restores supported account locales and preserves the destination', () => {
  expect(
    execFileSync(process.execPath, ['run', 'tests/integration/locale.mjs'], {
      encoding: 'utf8',
      timeout: 30000,
    }),
  ).toContain('locale sign-in cases passed');
});
