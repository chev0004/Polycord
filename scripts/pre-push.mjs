import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { planChanges } from './ci-plan.mjs';

const missing = /^0+$/;

export function needsChecks(input, run = spawnSync) {
  return input
    .split('\n')
    .filter(Boolean)
    .some((line) => {
      const [, local, , remote] = line.split(' ');
      if (missing.test(local)) return false;
      const base = missing.test(remote)
        ? run('git', ['merge-base', local, 'origin/develop'], {
            encoding: 'utf8',
          }).stdout?.trim()
        : remote;
      return !base || planChanges(base, local, run).jobs.static;
    });
}

if (import.meta.main) {
  if (needsChecks(readFileSync(0, 'utf8')))
    process.exitCode =
      spawnSync('bun', ['run', 'check:all'], { stdio: 'inherit' }).status ?? 1;
  else console.log('Docs-only push, skipping check:all.');
}
