import { spawnSync } from 'node:child_process';
import {
  ciPolicy,
  evidence,
  jobNames,
  releaseContext,
  resultContext,
  treeOf,
} from './ci-evidence.mjs';

export async function reportResult(
  env = process.env,
  run = spawnSync,
  request = fetch,
) {
  const { gate, ...jobs } = JSON.parse(env.NEEDS);
  const plan = gate?.outputs ?? {};
  const validated = plan.validate === 'true';
  const failed = jobNames.flatMap((name) => {
    const required = plan[name];
    if (required !== 'true' && required !== 'false')
      return [`${name} plan missing`];
    const result = jobs[name]?.result ?? 'missing';
    return result === (required === 'true' ? 'success' : 'skipped')
      ? []
      : [`${name} ${result}`];
  });
  if (gate?.result !== 'success')
    failed.unshift(`gate ${gate?.result ?? 'missing'}`);
  else if (
    plan.validate !== String(jobNames.some((name) => plan[name] === 'true'))
  )
    failed.unshift('validation plan missing or inconsistent');
  if (failed.length) return { passed: false, reason: failed.join(', ') };
  const release = env.RELEASE_SHA && (validated || plan.reused === 'true');
  const sha = release
    ? env.RELEASE_SHA
    : validated && env.RECORD_EVIDENCE === 'true' && env.HEAD_SHA;
  if (!sha) return { passed: true, reason: 'No evidence recorded.' };

  const tree = treeOf('HEAD', run);
  const policy = ciPolicy('HEAD', run);
  if (!tree || !policy)
    return { passed: false, reason: 'Cannot read the checked-out tree.' };
  if (release && tree !== treeOf(sha, run))
    return {
      passed: false,
      reason: 'Checked-out tree differs from the release.',
    };
  const response = await request(
    `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/statuses/${sha}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify({
        state: 'success',
        context: release ? releaseContext : resultContext,
        description: evidence(tree, policy),
        target_url: `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}/attempts/${env.GITHUB_RUN_ATTEMPT}`,
      }),
    },
  );
  return response.ok
    ? { passed: true, reason: `Recorded ${evidence(tree, policy)}.` }
    : {
        passed: false,
        reason: `Recording evidence failed (${response.status}).`,
      };
}

if (import.meta.main) {
  const result = await reportResult();
  console.log(result.reason);
  if (!result.passed) process.exitCode = 1;
}
