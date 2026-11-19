import { spawnSync } from 'node:child_process';

const nonDeployable = [
  /\.md$/,
  /^docs\//,
  /^LICENSE$/,
  /^e2e\//,
  /^tests\//,
  /\.test\.[cm]?[jt]sx?$/,
  /\.node\.mjs$/,
  /\.stories\.[jt]sx?$/,
  /^\.storybook\//,
  /^\.husky\//,
  /^playwright(\.storybook)?\.config\.ts$/,
];

export const isDeployable = (path) =>
  !nonDeployable.some((pattern) => pattern.test(path));

export function deployableChanges(from, to, run = spawnSync) {
  const result = run(
    'git',
    ['diff', '--no-renames', '--name-only', from, to, '--'],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) return null;
  return result.stdout.split('\n').filter(Boolean).filter(isDeployable);
}
