import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { ciPolicy, evidence, treeOf } from './ci-evidence.mjs';
import { reportResult } from './ci-result.mjs';

const originalCwd = process.cwd();
let posts;
let accept;

const git = (...args) => spawnSync('git', args, { encoding: 'utf8' });

const needs = (
  validate,
  results = {},
  planned = ['unit', 'e2e', 'storybook'],
) =>
  JSON.stringify({
    gate: {
      result: 'success',
      outputs: {
        validate: String(validate),
        ...Object.fromEntries(
          ['unit', 'e2e', 'storybook'].map((job) => [
            job,
            String(validate && planned.includes(job)),
          ]),
        ),
      },
    },
    ...Object.fromEntries(
      ['unit', 'e2e', 'storybook'].map((job) => [
        job,
        { result: validate && planned.includes(job) ? 'success' : 'skipped' },
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(results).map(([name, result]) => [name, { result }]),
    ),
  });

const env = (overrides) => ({
  GITHUB_REPOSITORY: 'chev0004/Polycord',
  GITHUB_SERVER_URL: 'https://github.com',
  GITHUB_RUN_ID: '42',
  GITHUB_RUN_ATTEMPT: '2',
  GITHUB_TOKEN: 'synthetic',
  GITHUB_EVENT_NAME: 'pull_request',
  HEAD_SHA: 'b'.repeat(40),
  RECORD_EVIDENCE: 'true',
  NEEDS: needs(true),
  ...overrides,
});

async function request(url, options) {
  posts.push({ url, body: JSON.parse(options.body) });
  return { ok: accept, status: accept ? 201 : 403 };
}

beforeEach(async () => {
  process.chdir(await mkdtemp(join(tmpdir(), 'polycord-result-')));
  git('init', '-q');
  git('config', 'user.email', 'ci@example.invalid');
  git('config', 'user.name', 'ci');
  await mkdir('.github');
  await writeFile('.github/tests.yml', 'v1');
  git('add', '-A');
  git('commit', '-qm', 'change');
  posts = [];
  accept = true;
});

afterEach(() => process.chdir(originalCwd));

test('records the checked-out tree and CI policy for a validated pull request', async () => {
  const result = await reportResult(env(), spawnSync, request);
  assert.equal(result.passed, true);
  assert.equal(posts.length, 1);
  assert.equal(
    posts[0].url,
    `https://api.github.com/repos/chev0004/Polycord/statuses/${'b'.repeat(40)}`,
  );
  assert.deepEqual(posts[0].body, {
    state: 'success',
    context: 'ci/result',
    description: evidence(treeOf('HEAD'), ciPolicy('HEAD')),
    target_url:
      'https://github.com/chev0004/Polycord/actions/runs/42/attempts/2',
  });
  assert.ok(posts[0].body.description.length <= 140);
});

test('fails when a planned job did not succeed', async () => {
  for (const state of ['failure', 'skipped', 'cancelled']) {
    const result = await reportResult(
      env({ NEEDS: needs(true, { storybook: state }) }),
      spawnSync,
      request,
    );
    assert.equal(result.passed, false);
    assert.match(result.reason, new RegExp(`storybook ${state}`));
  }
  assert.equal(posts.length, 0);
});

test('fails when the gate failed', async () => {
  const result = await reportResult(
    env({
      NEEDS: JSON.stringify({
        gate: { result: 'failure', outputs: {} },
        unit: { result: 'skipped' },
      }),
    }),
    spawnSync,
    request,
  );
  assert.equal(result.passed, false);
  assert.match(result.reason, /gate failure/);
});

test('passes a planned skip without recording evidence', async () => {
  const result = await reportResult(
    env({ NEEDS: needs(false) }),
    spawnSync,
    request,
  );
  assert.equal(result.passed, true);
  assert.equal(posts.length, 0);
  const ran = await reportResult(
    env({ NEEDS: needs(false, { unit: 'success' }) }),
    spawnSync,
    request,
  );
  assert.equal(ran.passed, false);
});

test('does not record evidence for forks or pushes', async () => {
  for (const overrides of [
    { RECORD_EVIDENCE: 'false' },
    { GITHUB_EVENT_NAME: 'push', RECORD_EVIDENCE: 'false' },
  ])
    assert.equal(
      (await reportResult(env(overrides), spawnSync, request)).passed,
      true,
    );
  assert.equal(posts.length, 0);
});

test('fails when the evidence cannot be recorded', async () => {
  accept = false;
  const result = await reportResult(env(), spawnSync, request);
  assert.equal(result.passed, false);
  assert.match(result.reason, /403/);
});

test('a scoped plan passes with its skipped jobs and fails if one ran', async () => {
  const scoped = await reportResult(
    env({ NEEDS: needs(true, {}, ['storybook']) }),
    spawnSync,
    request,
  );
  assert.equal(scoped.passed, true);
  const unplanned = await reportResult(
    env({ NEEDS: needs(true, { unit: 'success' }, ['storybook']) }),
    spawnSync,
    request,
  );
  assert.equal(unplanned.passed, false);
});
