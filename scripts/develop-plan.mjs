import { spawnSync } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import {
  ciPolicy,
  evidence,
  requiredJobs,
  resultContext,
  treeOf,
} from './ci-evidence.mjs';
import { deployableChanges, publishedContext } from './deploy-inputs.mjs';

const activeStates = [
  'queued',
  'in_progress',
  'waiting',
  'pending',
  'requested',
];
const docsOnly = /\.md$|^docs\/|^LICENSE$/;

async function provenRun(sha, env, run, github, wait) {
  const tree = treeOf(sha, run);
  const policy = ciPolicy(sha, run);
  if (!tree || !policy || policy !== ciPolicy(`${sha}^1`, run)) return null;
  const pull = (await github(`commits/${sha}/pulls`))?.find(
    (candidate) => candidate.merged_at && candidate.merge_commit_sha === sha,
  );
  if (!pull) return null;

  for (let check = 0; check < 30; check++) {
    const statuses =
      (await github(`commits/${pull.head.sha}/statuses?per_page=100`)) ?? [];
    for (const status of statuses) {
      const [, id, attempt] =
        status.target_url?.match(/\/actions\/runs\/(\d+)\/attempts\/(\d+)$/) ??
        [];
      if (
        status.context !== resultContext ||
        status.state !== 'success' ||
        status.description !== evidence(tree, policy) ||
        !id
      )
        continue;
      const ciRun = await github(`actions/runs/${id}`);
      if (
        ciRun?.path !== '.github/workflows/tests.yml' ||
        ciRun.event !== 'pull_request' ||
        ciRun.head_sha !== pull.head.sha ||
        ciRun.head_repository?.full_name !== env.GITHUB_REPOSITORY ||
        ciRun.status !== 'completed' ||
        ciRun.conclusion !== 'success' ||
        String(ciRun.run_attempt) !== attempt
      )
        continue;
      const jobs =
        (
          await github(
            `actions/runs/${id}/attempts/${attempt}/jobs?per_page=100`,
          )
        )?.jobs ?? [];
      const names = jobs.map(({ name }) => name.replace(/ \(.*\)$/, ''));
      if (
        jobs.every(({ conclusion }) => conclusion === 'success') &&
        requiredJobs.every((name) => names.includes(name))
      )
        return ciRun.id;
    }
    const runs = await github(
      `actions/workflows/tests.yml/runs?event=pull_request&head_sha=${pull.head.sha}&per_page=20`,
    );
    if (
      !runs?.workflow_runs.some(({ status }) => activeStates.includes(status))
    )
      return null;
    await wait(30000);
  }
  return null;
}

export async function planDevelop(
  env = process.env,
  run = spawnSync,
  request = fetch,
  wait = setTimeout,
) {
  const sha = env.GITHUB_SHA;
  const develop = env.GITHUB_REF === 'refs/heads/develop';
  if (env.GITHUB_EVENT_NAME === 'pull_request') {
    const diff = run(
      'git',
      ['diff', '--no-renames', '--name-only', 'HEAD^1', 'HEAD'],
      {
        encoding: 'utf8',
      },
    );
    const files =
      diff.status === 0 ? diff.stdout.split('\n').filter(Boolean) : [];
    return files.length && files.every((path) => docsOnly.test(path))
      ? { validate: false, deploy: false, reason: 'Docs-only pull request.' }
      : { validate: true, deploy: false, reason: 'Validate the pull request.' };
  }
  if (env.GITHUB_EVENT_NAME !== 'push')
    return {
      validate: true,
      deploy: develop,
      reason: 'Manual run validates fully.',
    };

  const github = async (path) => {
    try {
      const response = await request(
        `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/${path}`,
        {
          headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            Accept: 'application/vnd.github+json',
          },
        },
      );
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  };
  const tip = develop
    ? (await github('git/ref/heads/develop'))?.object?.sha
    : undefined;
  if (tip && tip !== sha)
    return {
      validate: false,
      deploy: false,
      reason: `Develop has advanced to ${tip}; the latest push validates its own snapshot.`,
    };
  const log = run(
    'git',
    ['rev-list', '--first-parent', '--max-count=50', sha],
    { encoding: 'utf8' },
  );
  const history =
    develop && log.status === 0 ? log.stdout.split('\n').filter(Boolean) : [];

  let published;
  for (const commit of history) {
    const statuses = await github(`commits/${commit}/statuses?per_page=100`);
    if (
      statuses?.some(
        ({ context, state }) =>
          context === publishedContext && state === 'success',
      )
    ) {
      published = commit;
      break;
    }
  }
  if (published && deployableChanges(published, sha, run)?.length === 0)
    return {
      validate: false,
      deploy: false,
      reason: `Staging already serves ${published} with the same deployable inputs.`,
    };

  const proven = await provenRun(sha, env, run, github, wait);
  if (proven)
    return {
      validate: false,
      deploy: develop,
      reason: `Run ${proven} validated the same tree under the same CI policy.`,
    };

  return { validate: true, deploy: develop, reason: 'Validate fully.' };
}

if (import.meta.main) {
  const plan = await planDevelop();
  console.log(plan.reason);
  if (process.env.GITHUB_OUTPUT)
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `validate=${plan.validate}\ndeploy=${plan.deploy}\n`,
    );
  if (process.env.GITHUB_STEP_SUMMARY)
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${plan.reason}\n`);
}
