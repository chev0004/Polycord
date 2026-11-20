import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { deployableChanges, isDeployable } from './deploy-inputs.mjs';
import { planDevelop } from './develop-plan.mjs';

const originalCwd = process.cwd();
let published;
let remoteTip;
let requests;

const git = (...args) =>
  spawnSync('git', args, { encoding: 'utf8' }).stdout.trim();

async function commit(files) {
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
  git('add', '-A');
  git('commit', '-qm', 'change');
  return git('rev-parse', 'HEAD');
}

const env = (sha, overrides = {}) => ({
  GITHUB_REPOSITORY: 'chev0004/Polycord',
  GITHUB_REF: 'refs/heads/develop',
  GITHUB_EVENT_NAME: 'push',
  GITHUB_SHA: sha,
  GITHUB_TOKEN: 'synthetic',
  TESTED_SKIP: 'false',
  ...overrides,
});

async function request(url) {
  requests.push(url);
  const path = url.replace(
    'https://api.github.com/repos/chev0004/Polycord/',
    '',
  );
  const statuses = path.match(/^commits\/(\w+)\/statuses/);
  if (statuses)
    return {
      ok: true,
      json: async () =>
        statuses[1] === published
          ? [{ context: 'staging/published', state: 'success' }]
          : [{ context: 'other', state: 'success' }],
    };
  assert.equal(path, 'git/ref/heads/develop');
  return {
    ok: Boolean(remoteTip),
    json: async () => ({ object: { sha: remoteTip } }),
  };
}

beforeEach(async () => {
  process.chdir(await mkdtemp(join(tmpdir(), 'polycord-plan-')));
  git('init', '-q');
  git('config', 'user.email', 'ci@example.invalid');
  git('config', 'user.name', 'ci');
  published = undefined;
  remoteTip = undefined;
  requests = [];
});

afterEach(() => process.chdir(originalCwd));

test('classifies docs, tests and stories as non-deployable', () => {
  for (const path of [
    'README.md',
    'docs/operations/readiness.md',
    'e2e/profile.pw.ts',
    'tests/migrations.test.js',
    'src/constants/languages.test.ts',
    'src/components/Button/Button.stories.tsx',
    'scripts/deploy-staging.node.mjs',
    '.storybook/main.ts',
    'playwright.config.ts',
  ])
    assert.equal(isDeployable(path), false, path);
  for (const path of [
    'src/app/page.tsx',
    'drizzle/0040_drop_email.sql',
    'bun.lock',
    'package.json',
    'netlify.toml',
    'public/icon.png',
    '.github/workflows/tests.yml',
    'scripts/deploy-staging.mjs',
  ])
    assert.equal(isDeployable(path), true, path);
});

test('treats an unknown revision as an unavailable comparison', async () => {
  const sha = await commit({ 'src/app.ts': 'a' });
  assert.equal(deployableChanges('f'.repeat(40), sha), null);
});

test('detects deployable files moved out of the app', async () => {
  const before = await commit({ 'src/notes.ts': 'a' });
  await mkdir('docs');
  git('mv', 'src/notes.ts', 'docs/notes.ts');
  git('commit', '-qm', 'move');
  assert.deepEqual(deployableChanges(before, git('rev-parse', 'HEAD')), [
    'src/notes.ts',
  ]);
});

test('pull requests and main pushes never deploy', async () => {
  assert.deepEqual(
    await planDevelop(
      env('a', { GITHUB_EVENT_NAME: 'pull_request' }),
      spawnSync,
      request,
    ),
    { validate: true, deploy: false, reason: 'Not a develop push.' },
  );
  const main = await planDevelop(
    env('a', { GITHUB_REF: 'refs/heads/main', TESTED_SKIP: 'true' }),
    spawnSync,
    request,
  );
  assert.equal(main.validate, false);
  assert.equal(main.deploy, false);
  assert.equal(requests.length, 0);
});

test('a manual develop run always validates and redeploys', async () => {
  const sha = await commit({ 'docs/a.md': 'a' });
  published = sha;
  const plan = await planDevelop(
    env(sha, { GITHUB_EVENT_NAME: 'workflow_dispatch' }),
    spawnSync,
    request,
  );
  assert.equal(plan.validate, true);
  assert.equal(plan.deploy, true);
});

test('skips validation and packaging after an equivalent publish', async () => {
  published = await commit({ 'src/app.ts': 'a' });
  await commit({ 'docs/a.md': 'a' });
  const tip = await commit({ 'e2e/a.pw.ts': 'a', 'src/a.test.ts': 'a' });
  const plan = await planDevelop(env(tip), spawnSync, request);
  assert.equal(plan.validate, false);
  assert.equal(plan.deploy, false);
});

test('validates code that differs from the last publish', async () => {
  published = await commit({ 'src/app.ts': 'a' });
  const tip = await commit({ 'src/app.ts': 'b', 'docs/a.md': 'a' });
  const plan = await planDevelop(env(tip), spawnSync, request);
  assert.equal(plan.validate, true);
  assert.equal(plan.deploy, true);
});

test('missing publish metadata takes the validation path', async () => {
  const tip = await commit({ 'docs/a.md': 'a' });
  const plan = await planDevelop(env(tip), spawnSync, request);
  assert.equal(plan.validate, true);
  assert.equal(plan.deploy, true);
  const offline = await planDevelop(env(tip), spawnSync, async () => {
    throw new Error('network');
  });
  assert.equal(offline.validate, true);
  assert.equal(offline.deploy, true);
});

test('deploys without validation when an identical tree already passed', async () => {
  const tip = await commit({ 'src/app.ts': 'a' });
  const plan = await planDevelop(
    env(tip, { TESTED_SKIP: 'true' }),
    spawnSync,
    request,
  );
  assert.equal(plan.validate, false);
  assert.equal(plan.deploy, true);
});

test('a stale gate that finishes late cannot schedule validation', async () => {
  const old = await commit({ 'src/app.ts': 'a' });
  remoteTip = await commit({ 'src/app.ts': 'b' });
  const latest = await planDevelop(env(remoteTip), spawnSync, request);
  const stale = await planDevelop(env(old), spawnSync, request);
  assert.equal(latest.validate, true);
  assert.equal(latest.deploy, true);
  assert.equal(stale.validate, false);
  assert.equal(stale.deploy, false);
});

test('the latest docs-only push validates even if its code predecessor fails', async () => {
  published = await commit({ 'src/app.ts': 'a' });
  await commit({ 'src/app.ts': 'b' });
  remoteTip = await commit({ 'docs/a.md': 'a' });
  const plan = await planDevelop(env(remoteTip), spawnSync, request);
  assert.equal(plan.validate, true);
  assert.equal(plan.deploy, true);
  assert.ok(requests.every((url) => !url.includes('/runs?')));
});
