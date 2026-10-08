import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test('gated routes enforce bans in-route and the middleware only skips routes using the wrapper', () => {
  expect(
    execFileSync(
      process.execPath,
      ['run', 'tests/integration/gated-route.mjs'],
      { encoding: 'utf8', timeout: 20000 },
    ),
  ).toContain('gated route enforcement passed');
}, 20000);
