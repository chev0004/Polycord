import { spawnSync } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import {
  ciPolicy,
  evidence,
  jobNames,
  resultContext,
  treeOf,
} from './ci-evidence.mjs';
import { fullPlan, planChanges } from './ci-plan.mjs';
import { deployableChanges, publishedContext } from './deploy-inputs.mjs';

const activeStates = [
  'queued',
  'in_progress',
  'waiting',
  'pending',
  'requested',
];
const noJobs = (reason) => ({
  jobs: Object.fromEntries(jobNames.map((job) => [job, false])),
  reasons: [reason],
});

async function provenRun(sha, env, run, github, wait) {
  const tree = treeOf(sha, run);
  const policy = ciPolicy(sha, run);
  if (!tree || !policy || policy !== ciPolicy(`${sha}^1`, run)) return null;
  const pull = (await github(`commits/${sha}/pulls`))?.find(
    (candidate) => candidate.merged_at && candidate.merge_commit_sha === sha,
  );
  if (!pull) return null;
  const { jobs: landed } = planChanges(`${sha}^1`, sha, run);
  const required = jobNames.filter((job) => landed[job]);

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
      const passed = (name) => {
        const matching = jobs.filter(
          (job) => job.name.replace(/ \(.*\)$/, '') === name,
        );
        return (
          matching.length > 0 &&
          matching.every(({ conclusion }) => conclusion === 'success')
        );
      };
      if (
        jobs.every(({ conclusion }) =>
          ['success', 'skipped'].includes(conclusion),
        ) &&
        ['gate', 'CI result', ...required].every(passed)
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
  if (env.GITHUB_EVENT_NAME === 'pull_request') {
    const labels = (await github(`pulls/${env.PR_NUMBER}`))?.labels ?? [];
    if (labels.some(({ name }) => name === 'full-ci'))
      return {
        ...fullPlan('The full-ci label requests the full suite.'),
        deploy: false,
      };
    const scoped = planChanges('HEAD^1', 'HEAD', run);
    const skipped = jobNames.filter((job) => !scoped.jobs[job]);
    if (
      env.SCOPED_PLANS === 'true' ||
      skipped.length === 0 ||
      skipped.length === jobNames.length
    )
      return { ...scoped, deploy: false };
    return {
      jobs: fullPlan().jobs,
      reasons: [
        `Scoped plans are off. The scoped plan would skip ${skipped.join(', ')}.`,
        ...scoped.reasons,
      ],
      deploy: false,
    };
  }
  if (env.GITHUB_EVENT_NAME !== 'push')
    return { ...fullPlan('Manual run validates fully.'), deploy: develop };

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
      ...noJobs(
        `Staging already serves ${published} with the same deployable inputs.`,
      ),
      deploy: false,
    };

  const proven = await provenRun(sha, env, run, github, wait);
  if (proven)
    return {
      ...noJobs(
        `Run ${proven} validated the same tree under the same CI policy.`,
      ),
      deploy: develop,
    };

  let source = sha;
  for (const commit of history.slice(1)) {
    if (deployableChanges(commit, sha, run)?.length !== 0) break;
    source = commit;
  }
  if (source !== sha) {
    const runs = await github(
      `actions/workflows/tests.yml/runs?head_sha=${source}&event=push&per_page=20`,
    );
    const pending = runs?.workflow_runs.find(({ status }) =>
      activeStates.includes(status),
    );
    if (pending)
      return {
        ...noJobs(
          `Run ${pending.id} for ${source} validates and deploys the same inputs.`,
        ),
        deploy: false,
      };
  }
  return { ...fullPlan('Validate fully.'), deploy: develop };
}

if (import.meta.main) {
  const plan = await planDevelop();
  const summary = [
    ...plan.reasons,
    ...jobNames.map((job) => `${job}: ${plan.jobs[job] ? 'runs' : 'skipped'}`),
  ].join('\n');
  console.log(summary);
  if (process.env.GITHUB_OUTPUT)
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `${jobNames.map((job) => `${job}=${plan.jobs[job]}\n`).join('')}validate=${Object.values(plan.jobs).some(Boolean)}\ndeploy=${plan.deploy}\n`,
    );
  if (process.env.GITHUB_STEP_SUMMARY)
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}
