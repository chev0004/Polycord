import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test('static discovery shell preserves the ban gate and RSC routing', () => {
  expect(
    execFileSync(
      process.execPath,
      ['run', 'tests/integration/static-discovery-shell.mjs'],
      {
        encoding: 'utf8',
        timeout: 10000,
      },
    ),
  ).toContain('static discovery shell preserves the ban gate and RSC routing');
});
