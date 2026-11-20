import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { ciPolicy, evidence, treeOf } from './ci-evidence.mjs';
import { deployableChanges, isDeployable } from './deploy-inputs.mjs';
import { planDevelop } from './develop-plan.mjs';

const originalCwd = process.cwd();
let statuses;
let pulls;
let ciRuns;
let jobs;
let runs;
let waits;
let remoteTip;

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

async function mergedPull(feature, baseAdvance) {
  await commit({ 'src/app.ts': 'a', '.github/workflows/tests.yml': 'v1' });
  git('checkout', '-qb', 'feature');
  const head = await commit(feature);
  git('checkout', '-q', '-');
  if (baseAdvance) await commit(baseAdvance);
  git('merge', '-q', '--no-ff', '-m', 'merge', 'feature');
  const merge = git('rev-parse', 'HEAD');
  pulls[merge] = [
    { merged_at: 'now', merge_commit_sha: merge, head: { sha: head } },
  ];
  return { head, merge };
}

function proveRun(head, description, attempt = 1) {
  ciRuns[11] = {
    id: 11,
    path: '.github/workflows/tests.yml',
    event: 'pull_request',
    head_sha: head,
    head_repository: { full_name: 'chev0004/Polycord' },
    status: 'completed',
    conclusion: 'success',
    run_attempt: attempt,
  };
  jobs['11/1'] = [
    'gate',
    'unit',
    'package',
    'e2e (--shard=1/2, true)',
    'e2e (--shard=2/2, true)',
    'storybook',
    'CI result',
  ].map((name) => ({ name, conclusion: 'success' }));
  statuses[head] = [
    {
      context: 'ci/result',
      state: 'success',
      description,
      target_url:
        'https://github.com/chev0004/Polycord/actions/runs/11/attempts/1',
    },
  ];
}

const env = (sha, overrides = {}) => ({
  GITHUB_REPOSITORY: 'chev0004/Polycord',
  GITHUB_REF: 'refs/heads/develop',
  GITHUB_EVENT_NAME: 'push',
  GITHUB_SHA: sha,
  GITHUB_TOKEN: 'synthetic',
  ...overrides,
});

async function request(url) {
  const path = url.replace(
    'https://api.github.com/repos/chev0004/Polycord/',
    '',
  );
  const reply = (data) => ({
    ok: data !== undefined,
    status: data === undefined ? 404 : 200,
    json: async () => data,
  });
  if (path === 'git/ref/heads/develop')
    return reply(remoteTip && { object: { sha: remoteTip } });
  let match = path.match(/^commits\/(\w+)\/statuses/);
  if (match) return reply(statuses[match[1]] ?? []);
  match = path.match(/^commits\/(\w+)\/pulls/);
  if (match) return reply(pulls[match[1]] ?? []);
  match = path.match(/^actions\/runs\/(\d+)\/attempts\/(\d+)\/jobs/);
  if (match) return reply({ jobs: jobs[`${match[1]}/${match[2]}`] ?? [] });
  match = path.match(/^actions\/runs\/(\d+)$/);
  if (match) return reply(ciRuns[match[1]]);
  match = path.match(/head_sha=(\w+)/);
  if (match) return reply({ workflow_runs: runs[match[1]] ?? [] });
  return reply(undefined);
}

const plan = (sha, overrides, wait = async () => waits++) =>
  planDevelop(env(sha, overrides), spawnSync, request, wait);
const publish = (sha) => {
  statuses[sha] = [{ context: 'staging/published', state: 'success' }];
};

beforeEach(async () => {
  process.chdir(await mkdtemp(join(tmpdir(), 'polycord-plan-')));
  git('init', '-q');
  git('config', 'user.email', 'ci@example.invalid');
  git('config', 'user.name', 'ci');
  statuses = {};
  pulls = {};
  ciRuns = {};
  jobs = {};
  runs = {};
  waits = 0;
  remoteTip = undefined;
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

test('pull requests validate unless they only change docs', async () => {
  await commit({ 'src/app.ts': 'a' });
  const docs = await commit({ 'README.md': 'a', 'docs/a.md': 'a' });
  const docsPlan = await plan(docs, { GITHUB_EVENT_NAME: 'pull_request' });
  assert.equal(docsPlan.validate, false);
  assert.equal(docsPlan.deploy, false);
  const code = await commit({ 'docs/b.md': 'b', 'src/app.ts': 'b' });
  const codePlan = await plan(code, { GITHUB_EVENT_NAME: 'pull_request' });
  assert.equal(codePlan.validate, true);
  assert.equal(codePlan.deploy, false);
});

test('a pull request without a comparable parent validates', async () => {
  const sha = await commit({ 'docs/a.md': 'a' });
  const result = await plan(sha, { GITHUB_EVENT_NAME: 'pull_request' });
  assert.equal(result.validate, true);
});

test('manual runs validate fully and deploy only from develop', async () => {
  const sha = await commit({ 'docs/a.md': 'a' });
  publish(sha);
  const develop = await plan(sha, { GITHUB_EVENT_NAME: 'workflow_dispatch' });
  assert.equal(develop.validate, true);
  assert.equal(develop.deploy, true);
  const main = await plan(sha, {
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: 'refs/heads/main',
  });
  assert.equal(main.validate, true);
  assert.equal(main.deploy, false);
});

test('skips validation and packaging after an equivalent publish', async () => {
  const published = await commit({ 'src/app.ts': 'a' });
  publish(published);
  await commit({ 'docs/a.md': 'a' });
  const tip = await commit({ 'e2e/a.pw.ts': 'a', 'src/a.test.ts': 'a' });
  const result = await plan(tip);
  assert.equal(result.validate, false);
  assert.equal(result.deploy, false);
});

test('validates code that differs from the last publish', async () => {
  publish(await commit({ 'src/app.ts': 'a' }));
  const tip = await commit({ 'src/app.ts': 'b', 'docs/a.md': 'a' });
  const result = await plan(tip);
  assert.equal(result.validate, true);
  assert.equal(result.deploy, true);
});

test('missing publish metadata takes the validation path', async () => {
  const tip = await commit({ 'docs/a.md': 'a' });
  const result = await plan(tip);
  assert.equal(result.validate, true);
  assert.equal(result.deploy, true);
  const offline = await planDevelop(env(tip), spawnSync, async () => {
    throw new Error('network');
  });
  assert.equal(offline.validate, true);
  assert.equal(offline.deploy, true);
});

test('reuses a green pull request run for the exact landed tree', async () => {
  const { head, merge } = await mergedPull({ 'src/app.ts': 'b' });
  proveRun(head, evidence(treeOf(merge), ciPolicy(merge)));
  const develop = await plan(merge);
  assert.equal(develop.validate, false);
  assert.equal(develop.deploy, true);
  assert.match(develop.reason, /Run 11/);
  const main = await plan(merge, { GITHUB_REF: 'refs/heads/main' });
  assert.equal(main.validate, false);
  assert.equal(main.deploy, false);
});

test('validates when the base advanced after the pull request run', async () => {
  const { head, merge } = await mergedPull(
    { 'src/app.ts': 'b' },
    { 'src/other.ts': 'a' },
  );
  proveRun(head, evidence(treeOf(head), ciPolicy(head)));
  assert.notEqual(treeOf(head), treeOf(merge));
  const result = await plan(merge);
  assert.equal(result.validate, true);
  assert.equal(result.deploy, true);
});

test('validates when the pull request changes CI policy', async () => {
  const { head, merge } = await mergedPull({
    'src/app.ts': 'b',
    '.github/workflows/tests.yml': 'v2',
  });
  proveRun(head, evidence(treeOf(merge), ciPolicy(merge)));
  assert.equal((await plan(merge)).validate, true);
});

test('validates when a required job did not pass', async () => {
  const { head, merge } = await mergedPull({ 'src/app.ts': 'b' });
  proveRun(head, evidence(treeOf(merge), ciPolicy(merge)));
  jobs['11/1'][2].conclusion = 'cancelled';
  assert.equal((await plan(merge)).validate, true);
  proveRun(head, evidence(treeOf(merge), ciPolicy(merge)));
  jobs['11/1'] = jobs['11/1'].filter(({ name }) => name !== 'storybook');
  assert.equal((await plan(merge)).validate, true);
});

test('validates when a later attempt superseded the evidence', async () => {
  const { head, merge } = await mergedPull({ 'src/app.ts': 'b' });
  proveRun(head, evidence(treeOf(merge), ciPolicy(merge)), 2);
  assert.equal((await plan(merge)).validate, true);
});

test('validates a direct push without a merged pull request', async () => {
  await commit({ 'src/app.ts': 'a' });
  const tip = await commit({ 'src/app.ts': 'b' });
  assert.equal((await plan(tip)).validate, true);
});

test('waits for an in-progress pull request run on the same tree', async () => {
  const { head, merge } = await mergedPull({ 'src/app.ts': 'b' });
  runs[head] = [{ id: 11, status: 'in_progress' }];
  const result = await plan(merge, {}, async () => {
    waits++;
    proveRun(head, evidence(treeOf(merge), ciPolicy(merge)));
  });
  assert.equal(waits, 1);
  assert.equal(result.validate, false);
  assert.equal(result.deploy, true);
});

test('does not wait when no pull request run is active', async () => {
  const { head, merge } = await mergedPull({ 'src/app.ts': 'b' });
  runs[head] = [{ id: 11, status: 'completed' }];
  assert.equal((await plan(merge)).validate, true);
  assert.equal(waits, 0);
});

test('a late stale gate skips its run without impacting the latest tip', async () => {
  const code = await commit({ 'src/app.ts': 'a' });
  remoteTip = await commit({ 'src/app.ts': 'b' });
  assert.equal((await plan(remoteTip)).validate, true);
  const result = await plan(code);
  assert.equal(result.validate, false);
  assert.equal(result.deploy, false);
});

test('a docs-only tip validates when its predecessor has not published', async () => {
  publish(await commit({ 'src/app.ts': 'a' }));
  await commit({ 'src/app.ts': 'b' });
  remoteTip = await commit({ 'docs/a.md': 'a' });
  const result = await plan(remoteTip);
  assert.equal(result.validate, true);
  assert.equal(result.deploy, true);
});
