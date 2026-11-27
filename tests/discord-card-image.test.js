import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

test.skipIf(!process.env.TEST_DATABASE_URL)(
  'discord card images render the saved layout from public fields',
  () => {
    expect(
      execFileSync(
        process.execPath,
        ['run', 'tests/integration/discord-card-image.mjs'],
        {
          encoding: 'utf8',
          timeout: 60000,
        },
      ),
    ).toContain('discord card image passed');
  },
);
