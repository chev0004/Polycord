import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { planChanges } from './ci-plan.mjs';

const missing = /^0+$/;

const git = (args, run) => {
  const result = run('git', args, { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
};

function refsToCheck(input, run) {
  return input
    .split('\n')
    .filter(Boolean)
    .filter((line) => {
      const [, local, , remote] = line.split(' ');
      if (missing.test(local)) return false;
      const base = missing.test(remote)
        ? git(['merge-base', local, 'origin/develop'], run)
        : remote;
      return !base || planChanges(base, local, run).jobs.static;
    });
}

export const needsChecks = (input, run = spawnSync) =>
  refsToCheck(input, run).length > 0;

export function checkPush(input, run = spawnSync, report = console) {
  const refs = refsToCheck(input, run);
  if (!refs.length) {
    report.log('No pushed refs need check:all.');
    return 0;
  }
  const head = git(['rev-parse', 'HEAD^{tree}'], run);
  const unmatched = refs.filter((line) => {
    const [, sha] = line.split(' ');
    return !head || git(['rev-parse', `${sha}^{tree}`], run) !== head;
  });
  if (
    unmatched.length ||
    git(['status', '--porcelain', '--untracked-files=no'], run) !== ''
  ) {
    report.error(
      'Push code refs from clean checkouts of their respective trees:',
      ...refs.map((line) => line.split(' ')[0]),
    );
    return 1;
  }
  return run('bun', ['run', 'check:all'], { stdio: 'inherit' }).status ?? 1;
}

if (import.meta.main) process.exitCode = checkPush(readFileSync(0, 'utf8'));
