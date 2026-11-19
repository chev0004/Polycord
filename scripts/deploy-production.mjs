import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import { deployNetlify, runDeploy } from './deploy-netlify.mjs';
import { stagingSiteId } from './deploy-staging.mjs';

async function seedRows() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      'select count(*)::int as count from seed_database',
    );
    return rows[0].count;
  } finally {
    await client.end();
  }
}

export async function deployProduction(
  run = spawnSync,
  request = fetch,
  countSeedRows = seedRows,
) {
  const siteId = process.env.NETLIFY_PRODUCTION_SITE_ID;
  const domain = process.env.POLYCORD_PRODUCTION_DOMAIN;
  assert.notEqual(
    siteId,
    stagingSiteId,
    'Production cannot use the staging site',
  );
  const origin = `https://${domain}`;
  return deployNetlify(
    {
      name: 'Production',
      siteId,
      domain,
      branch: 'main',
      events: ['workflow_dispatch'],
      requireCi: true,
      checkValues: async (values) => {
        assert.equal(
          values.POLYCORD_PUBLIC_URL,
          origin,
          'POLYCORD_PUBLIC_URL must be the production origin',
        );
        assert.equal(
          values.DISCORD_REDIRECT_URI,
          `${origin}/api/auth/discord/callback`,
          'DISCORD_REDIRECT_URI must use the production origin',
        );
        assert.ok(
          !values.POLYCORD_ENVIRONMENT,
          'POLYCORD_ENVIRONMENT must be unset',
        );
        assert.ok(
          !values.POLYCORD_SEED_ENABLED,
          'POLYCORD_SEED_ENABLED must be unset',
        );
        for (const key of [
          'DISCORD_CLIENT_ID',
          'DISCORD_CLIENT_SECRET',
          'POLYCORD_ADMIN_USER_IDS',
          'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
          'VAPID_PRIVATE_KEY',
          'VAPID_SUBJECT',
          'NEXT_PUBLIC_DISCORD_INVITE_URL',
        ])
          assert.ok(values[key], `${key} is required`);
        assert.equal(
          await countSeedRows(),
          0,
          'The production database is marked as a seed database',
        );
        return [
          `Origin: ${origin}`,
          `Administrators: ${values.POLYCORD_ADMIN_USER_IDS.split(',').filter(Boolean).length}`,
          `Analytics: ${values.POLYCORD_ANALYTICS_DISABLED === 'true' ? 'disabled' : 'enabled'}`,
          'Seeding: off, no seed database row',
        ];
      },
    },
    run,
    request,
  );
}

if (import.meta.main) await runDeploy(deployProduction, 'Production');
