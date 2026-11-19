import { spawnSync } from 'node:child_process';
import { ciPolicy, evidence, resultContext, treeOf } from './ci-evidence.mjs';

export async function reportResult(
  env = process.env,
  run = spawnSync,
  request = fetch,
) {
  const { gate, ...jobs } = JSON.parse(env.NEEDS);
  const validated = gate.outputs.validate === 'true';
  const failed = Object.entries(jobs)
    .filter(([, job]) => job.result !== (validated ? 'success' : 'skipped'))
    .map(([name, job]) => `${name} ${job.result}`);
  if (gate.result !== 'success') failed.unshift(`gate ${gate.result}`);
  if (failed.length) return { passed: false, reason: failed.join(', ') };
  if (!validated || env.RECORD_EVIDENCE !== 'true')
    return { passed: true, reason: 'No evidence recorded.' };

  const tree = treeOf('HEAD', run);
  const policy = ciPolicy('HEAD', run);
  if (!tree || !policy)
    return { passed: false, reason: 'Cannot read the checked-out tree.' };
  const response = await request(
    `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/statuses/${env.HEAD_SHA}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify({
        state: 'success',
        context: resultContext,
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
