import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export const resultContext = 'ci/result';
const policyPaths = [
  '.github',
  'scripts/ci-evidence.mjs',
  'scripts/ci-plan.mjs',
  'scripts/ci-result.mjs',
  'scripts/deploy-inputs.mjs',
  'scripts/develop-plan.mjs',
];

const git = (args, run) => {
  const result = run('git', args, { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
};

export const treeOf = (rev, run = spawnSync) =>
  git(['rev-parse', '--verify', `${rev}^{tree}`], run);

export function ciPolicy(rev, run = spawnSync) {
  const files = git(['ls-tree', '-r', rev, '--', ...policyPaths], run);
  return files && createHash('sha256').update(files).digest('hex');
}

export const evidence = (tree, policy) => `tree=${tree} policy=${policy}`;
