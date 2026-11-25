import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import { matchesSupabaseProject } from '../src/db/supabase-project.mjs';
import supabaseCa from '../src/db/supabaseCa.json' with { type: 'json' };
import { deployNetlify, runDeploy } from './deploy-netlify.mjs';
import { stagingSiteId } from './deploy-staging.mjs';

async function seedRows() {
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.delete('sslmode');
  const client = new pg.Client({
    connectionString: url.href,
    ssl: { ca: supabaseCa, rejectUnauthorized: true },
  });
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
  const project = process.env.POLYCORD_PRODUCTION_SUPABASE_PROJECT_REF;
  assert.match(
    project ?? '',
    /^[a-z0-9]{20}$/,
    'Set the approved production Supabase project ref',
  );
  assert.notEqual(
    project,
    'lqyekuxzhxkjsctdpybi',
    'Production cannot use the staging Supabase project',
  );
  return deployNetlify(
    {
      name: 'Production',
      siteId,
      domain,
      branch: 'prod',
      events: [],
      checkValues: async (values, readEnv) => {
        assert.ok(
          matchesSupabaseProject(process.env.DATABASE_URL, project),
          'Local DATABASE_URL must point to the approved production Supabase project',
        );
        const runtime = readEnv('functions');
        assert.ok(
          runtime.DATABASE_URL,
          'Set DATABASE_URL for Netlify Functions',
        );
        assert.equal(
          runtime.POLYCORD_PRODUCTION_SUPABASE_PROJECT_REF,
          project,
          'Netlify Functions must use the approved production Supabase project ref',
        );
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
          `Supabase project: ${project} (local and verified runtime database)`,
          `Administrators: ${values.POLYCORD_ADMIN_USER_IDS.split(',').filter(Boolean).length}`,
          `Analytics: ${values.POLYCORD_ANALYTICS_DISABLED === 'true' ? 'disabled' : 'enabled'}`,
          'Seeding: off, no seed database row',
        ];
      },
      verifyPublished: async (deploy) => {
        const health = new URL('/api/health', deploy.deploy_ssl_url);
        const response = await request(health.href, {
          redirect: 'error',
          signal: AbortSignal.timeout(30_000),
        });
        assert.ok(
          response.ok && (await response.json()).status === 'ok',
          'Published production database health check failed',
        );
      },
    },
    run,
    request,
  );
}

if (import.meta.main) await runDeploy(deployProduction, 'Production');
