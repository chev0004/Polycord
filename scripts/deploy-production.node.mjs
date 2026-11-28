import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { matchesSupabaseProject } from '../src/db/supabase-project.mjs';
import { evidence } from './ci-evidence.mjs';
import { deployProduction } from './deploy-production.mjs';

const siteId = 'production-site';
const project = 'abcdefghijklmnopqrst';
const runtimeUrl = `postgresql://postgres.${project}:test@aws-1-us-west-2.pooler.supabase.com:6543/postgres`;
const sha = 'c'.repeat(40);
const origin = 'https://polycord.example';
const deployUrl = 'https://uploaded--polycord-production.netlify.app';
const digest = createHash('sha256').update('server archive').digest('hex');
const policy = createHash('sha256').update('policy files').digest('hex');
const originalCwd = process.cwd();
const originalEnv = { ...process.env };
let calls;
let values;
let functionValues;
let ciStatuses;
let seedRows;
let site;
let healthy;

beforeEach(async () => {
  process.env = {
    ...originalEnv,
    GITHUB_REPOSITORY: 'chev0004/Polycord',
    GITHUB_ACTIONS: 'false',
    GITHUB_STEP_SUMMARY: '',
    NETLIFY_AUTH_TOKEN: 'synthetic-token',
    DATABASE_URL: `postgresql://postgres:test@db.${project}.supabase.co:5432/postgres`,
    POLYCORD_PRODUCTION_SUPABASE_PROJECT_REF: project,
    GITHUB_TOKEN: 'synthetic-github-token',
    NETLIFY_PRODUCTION_SITE_ID: siteId,
    POLYCORD_PRODUCTION_DOMAIN: 'polycord.example',
  };
  delete process.env.TEST_DATABASE_URL;
  process.chdir(await mkdtemp(join(tmpdir(), 'polycord-production-')));
  await mkdir('.netlify/static/_next/static', { recursive: true });
  await mkdir('.netlify/functions', { recursive: true });
  await mkdir('.netlify/edge-functions', { recursive: true });
  await writeFile(
    '.netlify/functions/___netlify-server-handler.zip',
    'server archive',
  );
  await writeFile(
    '.netlify/functions/manifest.json',
    JSON.stringify({
      functions: [
        { name: '___netlify-server-handler', runtimeVersion: 'nodejs22.x' },
      ],
    }),
  );
  await writeFile(
    '.netlify/edge-functions/manifest.json',
    JSON.stringify({
      functions: [{ function: '___netlify-edge-handler-node-middleware' }],
    }),
  );
  calls = [];
  values = {
    AUTH_SECRET: 'synthetic-secret',
    POLYCORD_PUBLIC_URL: origin,
    DISCORD_REDIRECT_URI: `${origin}/api/auth/discord/callback`,
    DISCORD_CLIENT_ID: 'id',
    DISCORD_CLIENT_SECRET: 'secret',
    POLYCORD_ADMIN_USER_IDS: '1,2',
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'public',
    VAPID_PRIVATE_KEY: 'private',
    VAPID_SUBJECT: origin,
    NEXT_PUBLIC_DISCORD_INVITE_URL: 'https://discord.gg/example',
    POLYCORD_ANALYTICS_DISABLED: 'true',
  };
  functionValues = {
    DATABASE_URL: '********',
    POLYCORD_PRODUCTION_SUPABASE_PROJECT_REF: project,
  };
  ciStatuses = [
    {
      context: 'ci/release',
      state: 'success',
      description: evidence(sha, policy),
      creator: { login: 'github-actions[bot]' },
    },
  ];
  seedRows = 0;
  healthy = true;
  site = {
    id: siteId,
    custom_domain: 'polycord.example',
    build_settings: { stop_builds: true },
    published_deploy: { id: 'previous' },
  };
});

afterEach(() => {
  process.chdir(originalCwd);
  process.env = { ...originalEnv };
});

function run(command, args, options) {
  calls.push({ command, args });
  let stdout = '';
  if (args[0] === 'rev-parse') stdout = sha;
  if (args[0] === 'ls-tree') stdout = 'policy files';
  if (args[0] === 'ls-remote') {
    assert.equal(args[2], 'refs/heads/prod');
    stdout = `${sha}\trefs/heads/prod\n`;
  }
  if (args[1] === 'env:list')
    stdout = JSON.stringify(
      args.includes('functions') ? functionValues : values,
    );
  if (args[1] === 'deploy') {
    site = { ...site, published_deploy: { id: 'uploaded' } };
    stdout = JSON.stringify({ deploy_id: 'uploaded' });
  }
  return { status: 0, stdout, env: options.env };
}

async function request(url, { method = 'GET' } = {}) {
  calls.push({ url, method });
  if (url.endsWith(`/commits/${sha}/statuses?per_page=100`))
    return { ok: true, json: async () => ciStatuses };
  if (url === `${deployUrl}/api/health`)
    return {
      ok: healthy,
      json: async () => ({ status: healthy ? 'ok' : 'unavailable' }),
    };
  const path = url.replace('https://api.netlify.com/api/v1/', '');
  let data;
  if (path === `sites/${siteId}`) data = structuredClone(site);
  if (path === 'deploys/uploaded')
    data = {
      id: 'uploaded',
      site_id: siteId,
      state: 'ready',
      build_id: null,
      deploy_ssl_url: deployUrl,
    };
  if (
    path === `sites/${siteId}/deploys/previous/restore` &&
    method === 'POST'
  ) {
    site.published_deploy = { id: 'previous' };
    data = {};
  }
  if (path === `sites/${siteId}/functions`)
    data = {
      functions: [
        { n: '___netlify-server-handler', r: 'nodejs22.x', d: digest },
      ],
    };
  assert.ok(data, `Unexpected request: ${url}`);
  return { ok: true, json: async () => data };
}

const deploy = () => deployProduction(run, request, async () => seedRows);
const built = () => calls.some(({ args }) => args?.[1] === 'build');

test('deploys the first validated prod commit with a masked database credential', async () => {
  site.build_settings = null;
  site.published_deploy = null;
  await deploy();
  assert.equal(site.published_deploy.id, 'uploaded');
  assert.ok(calls.some(({ url }) => url === `${deployUrl}/api/health`));
  assert.equal(
    calls.some(({ url }) => url?.includes('/statuses/')),
    false,
  );
});

test('requires stopped builds when production is linked to a repository', async () => {
  site.git_provider = 'github';
  site.build_settings.stop_builds = false;
  await assert.rejects(deploy(), /Stop Netlify builds/);
  assert.equal(built(), false);
});

test('restores the previous deploy when production database health fails', async () => {
  healthy = false;
  await assert.rejects(deploy(), /production database health check failed/);
  assert.equal(site.published_deploy.id, 'previous');
});

test('reports failed production database health on the first deploy', async () => {
  healthy = false;
  site.published_deploy = null;
  await assert.rejects(deploy(), /production database health check failed/);
  assert.equal(
    calls.some(({ method }) => method === 'POST'),
    false,
  );
});

test('only the owner can deploy production, never GitHub Actions', async () => {
  Object.assign(process.env, {
    GITHUB_ACTIONS: 'true',
    GITHUB_REF: 'refs/heads/prod',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_SHA: sha,
  });
  await assert.rejects(deploy());
  assert.equal(calls.length, 0);
});

test('refuses the staging site', async () => {
  process.env.NETLIFY_PRODUCTION_SITE_ID =
    '694f7324-d2b5-43b5-9de4-ae33e0b927ee';
  await assert.rejects(deploy(), /staging site/);
  assert.equal(calls.length, 0);
});

test('refuses a candidate without release evidence or local validation', async () => {
  ciStatuses = [];
  await assert.rejects(deploy(), /No valid CI release evidence/);
  assert.equal(built(), false);
});

test('refuses staging or seeding configuration before building', async () => {
  for (const [key, value, message] of [
    ['POLYCORD_PUBLIC_URL', 'https://polycord.chev.dev', /production origin/],
    ['POLYCORD_ENVIRONMENT', 'staging', /POLYCORD_ENVIRONMENT/],
    ['POLYCORD_SEED_ENABLED', 'true', /POLYCORD_SEED_ENABLED/],
    ['VAPID_SUBJECT', '', /VAPID_SUBJECT/],
  ]) {
    const original = values[key];
    values[key] = value;
    await assert.rejects(deploy(), message);
    values[key] = original;
  }
  assert.equal(built(), false);
});

test('refuses a database marked for seeding', async () => {
  seedRows = 1;
  await assert.rejects(deploy(), /seed database/);
  assert.equal(built(), false);
});

test('requires the configured Functions credential and the approved project reference', async () => {
  delete functionValues.DATABASE_URL;
  await assert.rejects(deploy(), /Set DATABASE_URL for Netlify Functions/);
  functionValues.DATABASE_URL = '********';
  functionValues.POLYCORD_PRODUCTION_SUPABASE_PROJECT_REF = 'z'.repeat(20);
  await assert.rejects(deploy(), /approved production Supabase project ref/);
  functionValues.POLYCORD_PRODUCTION_SUPABASE_PROJECT_REF = project;
  process.env.DATABASE_URL = 'postgresql://localhost/postgres';
  await assert.rejects(deploy(), /Local DATABASE_URL/);
  assert.equal(built(), false);
});

test('matches a project-bound pooler URL without allowing host overrides', () => {
  assert.equal(matchesSupabaseProject(runtimeUrl, project), true);
  assert.equal(matchesSupabaseProject(runtimeUrl, 'z'.repeat(20)), false);
  assert.equal(
    matchesSupabaseProject(`${runtimeUrl}?host=another`, project),
    false,
  );
});
