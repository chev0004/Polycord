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
let pullLabels;

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
    'static',
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
  let match = path.match(/^pulls\/(\d+)$/);
  if (match) return reply({ labels: pullLabels[match[1]] ?? [] });
  match = path.match(/^commits\/(\w+)\/statuses/);
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
const validates = ({ jobs }) => Object.values(jobs).some(Boolean);
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
  pullLabels = {};
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
  assert.equal(validates(docsPlan), false);
  assert.equal(docsPlan.deploy, false);
  const code = await commit({ 'docs/b.md': 'b', 'src/app.ts': 'b' });
  const codePlan = await plan(code, { GITHUB_EVENT_NAME: 'pull_request' });
  assert.equal(validates(codePlan), true);
  assert.equal(codePlan.deploy, false);
});

test('a pull request without a comparable parent validates', async () => {
  const sha = await commit({ 'docs/a.md': 'a' });
  const result = await plan(sha, { GITHUB_EVENT_NAME: 'pull_request' });
  assert.equal(validates(result), true);
});

test('manual runs validate fully and deploy only from develop', async () => {
  const sha = await commit({ 'docs/a.md': 'a' });
  publish(sha);
  const develop = await plan(sha, { GITHUB_EVENT_NAME: 'workflow_dispatch' });
  assert.equal(validates(develop), true);
  assert.equal(develop.deploy, true);
  const main = await plan(sha, {
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: 'refs/heads/main',
  });
  assert.equal(validates(main), true);
  assert.equal(main.deploy, false);
});

test('skips validation and packaging after an equivalent publish', async () => {
  const published = await commit({ 'src/app.ts': 'a' });
  publish(published);
  await commit({ 'docs/a.md': 'a' });
  const tip = await commit({ 'e2e/a.pw.ts': 'a', 'src/a.test.ts': 'a' });
  const result = await plan(tip);
  assert.equal(validates(result), false);
  assert.equal(result.deploy, false);
  assert.equal(result.reused, undefined);
});

test('validates code that differs from the last publish', async () => {
  publish(await commit({ 'src/app.ts': 'a' }));
  const tip = await commit({ 'src/app.ts': 'b', 'docs/a.md': 'a' });
  const result = await plan(tip);
  assert.equal(validates(result), true);
  assert.equal(result.deploy, true);
});

test('missing publish metadata takes the validation path', async () => {
  const tip = await commit({ 'docs/a.md': 'a' });
  const result = await plan(tip);
  assert.equal(validates(result), true);
  assert.equal(result.deploy, true);
  const offline = await planDevelop(env(tip), spawnSync, async () => {
    throw new Error('network');
  });
  assert.equal(validates(offline), true);
  assert.equal(offline.deploy, true);
});

test('reuses a green pull request run for the exact landed tree', async () => {
  const { head, merge } = await mergedPull({ 'src/app.ts': 'b' });
  proveRun(head, evidence(treeOf(merge), ciPolicy(merge)));
  const develop = await plan(merge);
  assert.equal(validates(develop), false);
  assert.equal(develop.deploy, true);
  assert.equal(develop.reused, true);
  assert.match(develop.reasons[0], /Run 11/);
  const main = await plan(merge, { GITHUB_REF: 'refs/heads/main' });
  assert.equal(validates(main), false);
  assert.equal(main.deploy, false);
});

test('runs static and unit checks when develop moved after the pull request run', async () => {
  const { head, merge } = await mergedPull(
    { 'src/app.ts': 'b' },
    { 'src/other.ts': 'a' },
  );
  proveRun(head, evidence(treeOf(head), ciPolicy(head)));
  assert.notEqual(treeOf(head), treeOf(merge));
  const develop = await plan(merge);
  assert.deepEqual(
    Object.keys(develop.jobs).filter((job) => develop.jobs[job]),
    ['static', 'unit'],
  );
  assert.equal(develop.deploy, true);
  assert.equal(develop.reused, undefined);
  assert.match(develop.reasons[0], /Run 11/);
  const prod = await plan(merge, { GITHUB_REF: 'refs/heads/prod' });
  assert.equal(Object.values(prod.jobs).every(Boolean), true);
});

test('validates when the pull request changes CI policy', async () => {
  const { head, merge } = await mergedPull({
    'src/app.ts': 'b',
    '.github/workflows/tests.yml': 'v2',
  });
  proveRun(head, evidence(treeOf(merge), ciPolicy(merge)));
  assert.equal(validates(await plan(merge)), true);
});

test('validates when a required job did not pass', async () => {
  const { head, merge } = await mergedPull({ 'src/app.ts': 'b' });
  proveRun(head, evidence(treeOf(merge), ciPolicy(merge)));
  jobs['11/1'][2].conclusion = 'cancelled';
  assert.equal(validates(await plan(merge)), true);
  proveRun(head, evidence(treeOf(merge), ciPolicy(merge)));
  jobs['11/1'] = jobs['11/1'].filter(({ name }) => name !== 'storybook');
  assert.equal(validates(await plan(merge)), true);
});

test('validates when a later attempt superseded the evidence', async () => {
  const { head, merge } = await mergedPull({ 'src/app.ts': 'b' });
  proveRun(head, evidence(treeOf(merge), ciPolicy(merge)), 2);
  assert.equal(validates(await plan(merge)), true);
});

test('validates a direct push without a merged pull request', async () => {
  await commit({ 'src/app.ts': 'a' });
  const tip = await commit({ 'src/app.ts': 'b' });
  assert.equal(validates(await plan(tip)), true);
});

test('waits for an in-progress pull request run on the same tree', async () => {
  const { head, merge } = await mergedPull({ 'src/app.ts': 'b' });
  runs[head] = [{ id: 11, status: 'in_progress' }];
  const result = await plan(merge, {}, async () => {
    waits++;
    proveRun(head, evidence(treeOf(merge), ciPolicy(merge)));
  });
  assert.equal(waits, 1);
  assert.equal(validates(result), false);
  assert.equal(result.deploy, true);
});

test('does not wait when no pull request run is active', async () => {
  const { head, merge } = await mergedPull({ 'src/app.ts': 'b' });
  runs[head] = [{ id: 11, status: 'completed' }];
  assert.equal(validates(await plan(merge)), true);
  assert.equal(waits, 0);
});

test('a docs-only tip validates when the code run has finished without publishing', async () => {
  publish(await commit({ 'src/app.ts': 'a' }));
  const code = await commit({ 'src/app.ts': 'b' });
  const tip = await commit({ 'docs/a.md': 'a' });
  runs[code] = [{ id: 7, status: 'completed' }];
  const result = await plan(tip);
  assert.equal(validates(result), true);
  assert.equal(result.deploy, true);
});

test('pull requests report the scoped plan but run fully until enabled', async () => {
  await commit({ 'src/app.ts': 'a', 'src/A.stories.tsx': 'a' });
  const story = await commit({ 'src/A.stories.tsx': 'b' });
  const shadow = await plan(story, { GITHUB_EVENT_NAME: 'pull_request' });
  assert.equal(Object.values(shadow.jobs).every(Boolean), true);
  assert.match(shadow.reasons[0], /would skip unit, package, e2e/);
  const scoped = await plan(story, {
    GITHUB_EVENT_NAME: 'pull_request',
    SCOPED_PLANS: 'true',
  });
  assert.deepEqual(
    Object.keys(scoped.jobs).filter((job) => scoped.jobs[job]),
    ['static', 'storybook'],
  );
});

test('the full-ci label requests the full suite', async () => {
  await commit({ 'src/app.ts': 'a', 'src/A.stories.tsx': 'a' });
  const story = await commit({ 'src/A.stories.tsx': 'b' });
  pullLabels[7] = [{ name: 'full-ci' }];
  const result = await plan(story, {
    GITHUB_EVENT_NAME: 'pull_request',
    SCOPED_PLANS: 'true',
    PR_NUMBER: '7',
  });
  assert.equal(Object.values(result.jobs).every(Boolean), true);
  assert.match(result.reasons[0], /full-ci/);
});

test('reuses a scoped run that covers the landed diff', async () => {
  const { head, merge } = await mergedPull({ 'src/A.stories.tsx': 'b' });
  proveRun(head, evidence(treeOf(merge), ciPolicy(merge)));
  for (const job of jobs['11/1'])
    if (!['gate', 'static', 'storybook', 'CI result'].includes(job.name))
      job.conclusion = 'skipped';
  assert.equal(validates(await plan(merge)), false);
});

test('does not reuse a scoped run when the landed diff needs more', async () => {
  const { head, merge } = await mergedPull({ 'src/app.ts': 'b' });
  proveRun(head, evidence(treeOf(merge), ciPolicy(merge)));
  for (const job of jobs['11/1'])
    if (job.name.startsWith('e2e')) job.conclusion = 'skipped';
  assert.equal(validates(await plan(merge)), true);
});
