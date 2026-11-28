import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test('the bot profile card endpoint returns paths for visible profiles only', () => {
  expect(
    execFileSync(
      process.execPath,
      ['run', 'tests/integration/bot-profile-card.mjs'],
      { encoding: 'utf8', timeout: 20000 },
    ),
  ).toContain('bot profile card passed');
}, 20000);
