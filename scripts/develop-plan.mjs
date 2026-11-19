import { spawnSync } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { deployableChanges, publishedContext } from './deploy-inputs.mjs';

const activeStates = [
  'queued',
  'in_progress',
  'waiting',
  'pending',
  'requested',
];

export async function planDevelop(
  env = process.env,
  run = spawnSync,
  request = fetch,
) {
  const sha = env.GITHUB_SHA;
  if (
    env.GITHUB_REF !== 'refs/heads/develop' ||
    env.GITHUB_EVENT_NAME === 'pull_request'
  )
    return {
      validate: env.TESTED_SKIP !== 'true',
      deploy: false,
      reason: 'Not a develop push.',
    };
  if (env.GITHUB_EVENT_NAME === 'workflow_dispatch')
    return {
      validate: true,
      deploy: true,
      reason: 'Manual run validates and redeploys.',
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
  const log = run(
    'git',
    ['rev-list', '--first-parent', '--max-count=50', sha],
    { encoding: 'utf8' },
  );
  const history =
    log.status === 0 ? log.stdout.split('\n').filter(Boolean) : [];

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
  if (env.TESTED_SKIP === 'true')
    return {
      validate: false,
      deploy: true,
      reason: 'An identical tree already passed validation.',
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
        validate: false,
        deploy: false,
        reason: `Run ${pending.id} for ${source} validates and deploys the same inputs.`,
      };
  }
  return { validate: true, deploy: true, reason: 'Validate before staging.' };
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
