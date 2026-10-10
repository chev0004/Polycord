import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test('load tracing is owner-only, toggle-gated and scoped to each request', () => {
  expect(
    execFileSync(
      process.execPath,
      ['run', 'tests/integration/load-trace.mjs'],
      {
        encoding: 'utf8',
        timeout: 20000,
      },
    ),
  ).toContain('load trace access passed');
});

test('load tracing counts the blank wait and freezes only after rendered-grid readiness', () => {
  expect(
    execFileSync(
      process.execPath,
      ['run', 'tests/integration/load-trace-client.mjs'],
      {
        encoding: 'utf8',
        timeout: 20000,
      },
    ),
  ).toContain('load trace lifecycle passed');
});
