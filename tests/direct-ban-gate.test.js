import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test('direct ban checks preserve identities, trusted IP and bounded failures', () => {
  expect(
    execFileSync(
      process.execPath,
      ['run', 'tests/integration/direct-ban-gate.mjs'],
      {
        encoding: 'utf8',
        timeout: 10000,
      },
    ),
  ).toContain('direct ban enforcement and deadline passed');
}, 10000);
