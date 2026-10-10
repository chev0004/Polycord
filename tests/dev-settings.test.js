import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test('only owners can save the dev toggles', () => {
  expect(
    execFileSync(
      process.execPath,
      ['run', 'tests/integration/dev-settings.mjs'],
      { encoding: 'utf8', timeout: 30000 },
    ),
  ).toContain('dev settings access passed');
});
