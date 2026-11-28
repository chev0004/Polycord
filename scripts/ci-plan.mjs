import { spawnSync } from 'node:child_process';
import { parse, TYPE } from '@formatjs/icu-messageformat-parser';

import { jobNames } from './ci-evidence.mjs';

const docs = /\.md$|^docs\/|^LICENSE$/;
const story = /^src\/.+\.stories\.tsx?$/;
const locale = /^src\/locales\/[\w-]+\.json$/;
const devTool = /^scripts\/locale-review\//;
const tooling = [
  '.husky/commit-msg',
  '.husky/pre-commit',
  '.husky/pre-push',
  'commitlint.config.mjs',
  'scripts/tickets.ts',
];

export const fullPlan = (reason) => ({
  jobs: Object.fromEntries(jobNames.map((job) => [job, true])),
  reasons: [reason],
});

const git = (args, run) => {
  const result = run('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return result.status === 0 ? result.stdout : null;
};

const flatten = (value, prefix = '', out = {}) => {
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === 'object')
      flatten(child, `${prefix}${key}.`, out);
    else out[`${prefix}${key}`] = child;
  }
  return out;
};

const copyCoverage = {
  'Admin.dismissTitle': ['e2e', 'storybook'],
  'Settings.profileViewAlertDescriptionFree': ['storybook'],
};

const signature = (message) =>
  JSON.stringify(parse(message), (_, entry) =>
    entry?.type === TYPE.literal ? { type: TYPE.literal } : entry,
  );

function copyChanges(base, head, path, run) {
  const before = git(['show', `${base}:${path}`], run);
  const after = git(['show', `${head}:${path}`], run);
  if (before === null || after === null) return null;
  try {
    const old = flatten(JSON.parse(before));
    const next = flatten(JSON.parse(after));
    const keys = Object.keys(old);
    if (keys.length !== Object.keys(next).length) return null;
    const changed = [];
    for (const key of keys) {
      if (typeof old[key] !== 'string' || typeof next[key] !== 'string')
        return null;
      if (old[key] === next[key]) continue;
      if (
        !Object.hasOwn(copyCoverage, key) ||
        signature(old[key]) !== signature(next[key])
      )
        return null;
      changed.push(key);
    }
    return changed;
  } catch {
    return null;
  }
}

export function planChanges(base, head, run = spawnSync) {
  const diff = git(
    ['diff', '--no-renames', '--name-only', base, head, '--'],
    run,
  );
  const files = diff?.split('\n').filter(Boolean);
  if (!files?.length) return fullPlan('The diff is unavailable or empty.');

  const jobs = Object.fromEntries(jobNames.map((job) => [job, false]));
  const reasons = [];
  for (const file of files) {
    if (docs.test(file)) continue;
    if (story.test(file)) {
      jobs.static = jobs.storybook = true;
      reasons.push(`${file}: story only, runs Storybook.`);
    } else if (tooling.includes(file)) {
      jobs.static = true;
      reasons.push(`${file}: isolated tooling, runs static checks.`);
    } else if (devTool.test(file)) {
      jobs.static = jobs.unit = true;
      reasons.push(`${file}: local dev tool, runs static and unit checks.`);
    } else if (locale.test(file)) {
      const values = copyChanges(base, head, file, run);
      if (!values)
        return fullPlan(
          `${file}: locale keys, message structure or coverage changed.`,
        );
      for (const key of values) {
        jobs.static = true;
        for (const job of copyCoverage[key]) jobs[job] = true;
        reasons.push(
          `${file}: copy only for ${key}, runs ${copyCoverage[key].join(' and ')}.`,
        );
      }
    } else return fullPlan(`${file}: shared or unclassified change.`);
  }
  if (!Object.values(jobs).some(Boolean)) reasons.push('Docs only.');
  return { jobs, reasons };
}
