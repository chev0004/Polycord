import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test.skipIf(!process.env.TEST_DATABASE_URL)(
  'discord card layouts follow the premium entitlement rules',
  () => {
    expect(
      execFileSync(
        process.execPath,
        ['run', 'tests/integration/discord-card.mjs'],
        {
          encoding: 'utf8',
          timeout: 30000,
        },
      ),
    ).toContain('discord card entitlement passed');
  },
);
