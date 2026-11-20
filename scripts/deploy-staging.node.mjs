import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { deployStaging } from './deploy-staging.mjs';

const siteId = '694f7324-d2b5-43b5-9de4-ae33e0b927ee';
const sha = 'a'.repeat(40);
const digest = createHash('sha256').update('server archive').digest('hex');
const originalCwd = process.cwd();
const originalEnv = { ...process.env };
let calls;
let site;
let head;
let buildHead;
let buildId;
let publishedDigest;
let diff;
let recordOk;
let ciRuns;
let status;

beforeEach(async () => {
  process.env = {
    ...originalEnv,
    GITHUB_REPOSITORY: 'chev0004/Polycord',
    GITHUB_REF: 'refs/heads/develop',
    GITHUB_EVENT_NAME: 'push',
    GITHUB_SHA: sha,
    GITHUB_ACTIONS: 'true',
    GITHUB_STEP_SUMMARY: '',
    NETLIFY_AUTH_TOKEN: 'synthetic-token',
    DATABASE_URL: 'postgresql://synthetic/actions',
    GITHUB_TOKEN: 'synthetic-github-token',
  };
  delete process.env.TEST_DATABASE_URL;
  process.chdir(await mkdtemp(join(tmpdir(), 'polycord-deploy-')));
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
  site = {
    id: siteId,
    custom_domain: 'polycord.chev.dev',
    build_settings: {
      repo_branch: 'develop',
      stop_builds: true,
    },
    published_deploy: { id: 'previous' },
  };
  head = sha;
  buildHead = sha;
  buildId = null;
  publishedDigest = digest;
  diff = 'src/app/page.tsx\n';
  recordOk = true;
  ciRuns = [{ conclusion: 'success' }];
  status = '';
});

afterEach(() => {
  process.chdir(originalCwd);
  process.env = { ...originalEnv };
});

function run(command, args, options) {
  calls.push({ command, args, env: options.env });
  let stdout = '';
  if (args[0] === 'rev-parse') stdout = sha;
  if (args[0] === 'ls-remote') stdout = `${head}\trefs/heads/develop\n`;
  if (args[0] === 'diff') stdout = diff;
  if (args[0] === 'status') stdout = status;
  if (args[1] === 'env:list')
    stdout = JSON.stringify({
      DATABASE_URL: '****************uire',
      AUTH_SECRET: 'synthetic-secret',
      NEXT_PUBLIC_DISCOVERY_SKELETON_ENABLED: 'false',
    });
  if (args[1] === 'build') head = buildHead;
  if (args[1] === 'deploy') {
    site = { ...site, published_deploy: { id: 'uploaded' } };
    stdout = JSON.stringify({ deploy_id: 'uploaded' });
  }
  return { status: 0, stdout };
}

async function request(url, options) {
  if (url.includes('/check-runs')) {
    calls.push({ url });
    return { ok: true, json: async () => ({ check_runs: ciRuns }) };
  }
  if (url.startsWith('https://api.github.com/')) {
    calls.push({ url, method: options.method, body: JSON.parse(options.body) });
    return { ok: recordOk, status: recordOk ? 201 : 500 };
  }
  const path = url.replace('https://api.netlify.com/api/v1/', '');
  calls.push({ path, method: options.method });
  let data;
  if (path === `sites/${siteId}`) data = structuredClone(site);
  if (path === 'deploys/uploaded')
    data = {
      id: 'uploaded',
      site_id: siteId,
      state: 'ready',
      build_id: buildId,
    };
  if (path === `sites/${siteId}/functions`)
    data = {
      functions: [
        { n: '___netlify-server-handler', r: 'nodejs22.x', d: publishedDigest },
      ],
    };
  if (path.endsWith('/previous/restore')) {
    site.published_deploy.id = 'previous';
    data = {};
  }
  assert.ok(data, `Unexpected provider request: ${path}`);
  return { ok: true, json: async () => data };
}

test('rejects pull requests and forks before accessing credentials or provider', async () => {
  process.env.GITHUB_EVENT_NAME = 'pull_request';
  await assert.rejects(deployStaging(run, request));
  process.env.GITHUB_EVENT_NAME = 'push';
  process.env.GITHUB_REPOSITORY = 'outsider/Polycord';
  await assert.rejects(deployStaging(run, request));
  assert.equal(calls.length, 0);
});

test('rejects branches other than develop before provider access', async () => {
  process.env.GITHUB_REF = 'refs/heads/main';
  await assert.rejects(deployStaging(run, request));
  assert.equal(calls.length, 0);
});

test('does not build or upload a superseded commit', async () => {
  head = 'b'.repeat(40);
  await deployStaging(run, request);
  assert.equal(
    calls.some(({ path }) => path),
    false,
  );
});

test('requires stopped builds on the exact staging site', async () => {
  site.build_settings.stop_builds = false;
  await assert.rejects(deployStaging(run, request), /Stop Netlify builds/);
  site.build_settings.stop_builds = true;
  site.id = 'unrelated-site';
  await assert.rejects(deployStaging(run, request));
  assert.equal(
    calls.some(({ args }) => args?.[1] === 'env:list'),
    false,
  );
});

test('skips upload if develop changes while building', async () => {
  buildHead = 'b'.repeat(40);
  await deployStaging(run, request);
  assert.equal(
    calls.some(({ args }) => args?.[1] === 'build'),
    true,
  );
  assert.equal(
    calls.some(({ args }) => args?.[1] === 'deploy'),
    false,
  );
});

test('manual deployment rebuilds from current provider variables and uploads without a build', async () => {
  process.env.GITHUB_EVENT_NAME = 'workflow_dispatch';
  await deployStaging(run, request);
  const build = calls.find(({ args }) => args?.[1] === 'build');
  assert.equal(build.env.AUTH_SECRET, 'synthetic-secret');
  assert.equal(build.env.DATABASE_URL, 'postgresql://synthetic/actions');
  assert.equal(build.env.NETLIFY_SITE_ID, siteId);
  assert.ok(build.args.includes('--offline'));
  const upload = calls.find(({ args }) => args?.[1] === 'deploy');
  assert.ok(upload.args.includes('--no-build'));
  assert.ok(upload.args.includes('--prod'));
  assert.equal(site.published_deploy.id, 'uploaded');
});

test('restores previous deployment if the published archive differs', async () => {
  publishedDigest = 'unexpected-digest';
  await assert.rejects(deployStaging(run, request), /Published server differs/);
  assert.equal(site.published_deploy.id, 'previous');
  assert.ok(calls.some(({ method }) => method === 'POST'));
});

test('rejects a hosted build job and restores the previous deployment', async () => {
  buildId = 'unexpected-build';
  await assert.rejects(
    deployStaging(run, request),
    /Unexpected hosted Netlify build/,
  );
  assert.equal(site.published_deploy.id, 'previous');
});

test('publishes an older source when develop only adds docs or tests', async () => {
  head = 'b'.repeat(40);
  diff = 'docs/operations/readiness.md\ne2e/profile.pw.ts\n';
  await deployStaging(run, request);
  assert.equal(site.published_deploy.id, 'uploaded');
  assert.ok(
    calls.some(
      ({ args }) => args?.[0] === 'fetch' && args.includes('b'.repeat(40)),
    ),
  );
});

test('records the published source only after verification', async () => {
  await deployStaging(run, request);
  const record = calls.find(({ url }) => url);
  assert.equal(
    record.url,
    `https://api.github.com/repos/chev0004/Polycord/statuses/${sha}`,
  );
  assert.equal(record.body.context, 'staging/published');
  assert.equal(record.body.state, 'success');
  assert.equal(
    calls.findIndex(({ url }) => url),
    calls.length - 1,
  );
});

test('does not record a source that failed verification', async () => {
  publishedDigest = 'unexpected-digest';
  await assert.rejects(deployStaging(run, request));
  assert.equal(
    calls.some(({ url }) => url),
    false,
  );
});

test('keeps a verified publish when recording its source fails', async () => {
  recordOk = false;
  await assert.rejects(deployStaging(run, request), /Recording the published/);
  assert.equal(site.published_deploy.id, 'uploaded');
});

const owner = () => {
  process.env.GITHUB_ACTIONS = 'false';
  for (const key of ['GITHUB_REF', 'GITHUB_EVENT_NAME', 'GITHUB_SHA'])
    delete process.env[key];
};
const ran = (script) => calls.filter(({ args }) => args?.includes(script));

test('an owner deploys the clean develop tip on CI evidence', async () => {
  owner();
  await deployStaging(run, request);
  assert.equal(site.published_deploy.id, 'uploaded');
  assert.deepEqual(ran('test:e2e'), []);
  assert.equal(
    calls.find(({ body }) => body).body.context,
    'staging/published',
  );
});

test('an owner without CI evidence runs the full suite on a disposable database first', async () => {
  owner();
  ciRuns = [];
  process.env.TEST_DATABASE_URL = 'postgresql://localhost/polycord_test';
  await deployStaging(run, request);
  const [e2e, barOnly] = ran('test:e2e');
  assert.equal(e2e.env.DATABASE_URL, 'postgresql://localhost/polycord_test');
  assert.ok(
    barOnly.args.includes('NEXT_PUBLIC_DISCOVERY_SKELETON_ENABLED=false'),
  );
  assert.equal(e2e.env.NETLIFY_AUTH_TOKEN, undefined);
  assert.equal(e2e.env.GITHUB_TOKEN, undefined);
  assert.ok(
    calls.indexOf(ran('test:storybook')[0]) <
      calls.findIndex(({ args }) => args?.[1] === 'env:list'),
  );
  assert.equal(site.published_deploy.id, 'uploaded');
});

test('refuses an owner deploy without evidence, from a dirty checkout or off the tip', async () => {
  owner();
  ciRuns = [{ conclusion: 'failure' }];
  await assert.rejects(deployStaging(run, request), /TEST_DATABASE_URL/);
  for (const url of [
    process.env.DATABASE_URL,
    'postgresql://remote/polycord_test',
    'postgresql://localhost/postgres',
    'postgresql://localhost/polycord_test?host=remote',
  ]) {
    process.env.TEST_DATABASE_URL = url;
    await assert.rejects(deployStaging(run, request), /TEST_DATABASE_URL/);
  }
  assert.equal(ran('migrate').length, 0);
  status = ' M src/app/page.tsx\n';
  await assert.rejects(deployStaging(run, request), /clean checkout/);
  status = '';
  head = 'b'.repeat(40);
  await assert.rejects(deployStaging(run, request), /develop tip/);
  assert.equal(
    calls.some(({ path }) => path),
    false,
  );
});
