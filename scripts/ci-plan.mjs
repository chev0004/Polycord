import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const jobNames = ['static', 'unit', 'package', 'e2e', 'storybook'];
const docs = /\.md$|^docs\/|^LICENSE$/;
const story = /^src\/.+\.stories\.tsx?$/;
const locale = /^src\/locales\/[\w-]+\.json$/;
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

const signature = (text) =>
  JSON.stringify([
    [...text.matchAll(/\{\s*(\w+)/g)].map(([, name]) => name).sort(),
    [...text.matchAll(/<\/?(\w+)/g)].map(([, tag]) => tag).sort(),
    text.split('{').length,
    text.split('}').length,
  ]);

function copyChanges(base, head, path, run) {
  const before = git(['show', `${base}:${path}`], run);
  const after = git(['show', `${head}:${path}`], run);
  if (before === null || after === null) return null;
  let old;
  let next;
  try {
    old = flatten(JSON.parse(before));
    next = flatten(JSON.parse(after));
  } catch {
    return null;
  }
  const keys = Object.keys(old);
  if (
    keys.length !== Object.keys(next).length ||
    keys.some(
      (key) =>
        typeof old[key] !== 'string' ||
        typeof next[key] !== 'string' ||
        signature(old[key]) !== signature(next[key]),
    )
  )
    return null;
  return keys
    .filter((key) => old[key] !== next[key])
    .map((key) => [old[key].toLowerCase(), next[key].toLowerCase()]);
}

const literals = (text) =>
  [
    ...text.matchAll(
      /'([^'\\\n]{4,})'|"([^"\\\n]{4,})"|`([^`\\$\n]{4,})`|\/((?:[^/\\\n]|\\.){4,})\/[a-z]*/g,
    ),
  ]
    .flatMap(([, single, double, template, regex]) =>
      regex === undefined
        ? [single ?? double ?? template]
        : regex.replace(/\\(.)/g, '$1').split(/\.\*|[|()^$?+[\]]/),
    )
    .map((literal) => literal.trim().toLowerCase())
    .filter((literal) => literal.length >= 4);

const distinctive = (fragment) =>
  fragment.split(/\s+/).length >= 3 ||
  (/[^\p{ASCII}]/u.test(fragment) && fragment.length >= 6);

function asserts(files, changes, read) {
  const found = files.flatMap((file) => literals(read(file)));
  return changes.some(([before, after]) =>
    found.some(
      (literal) =>
        literal.includes(before) ||
        (before.includes(literal) &&
          !after.includes(literal) &&
          distinctive(literal)),
    ),
  );
}

export function planChanges(
  base,
  head,
  run = spawnSync,
  read = (file) => readFileSync(file, 'utf8'),
) {
  const diff = git(
    ['diff', '--no-renames', '--name-only', base, head, '--'],
    run,
  );
  const files = diff?.split('\n').filter(Boolean);
  if (!files?.length) return fullPlan('The diff is unavailable or empty.');

  const jobs = Object.fromEntries(jobNames.map((job) => [job, false]));
  const reasons = [];
  const copy = [];
  for (const file of files) {
    if (docs.test(file)) continue;
    if (story.test(file)) {
      jobs.static = jobs.storybook = true;
      reasons.push(`${file}: story only, runs Storybook.`);
    } else if (tooling.includes(file)) {
      jobs.static = true;
      reasons.push(`${file}: isolated tooling, runs static checks.`);
    } else if (locale.test(file)) {
      const values = copyChanges(base, head, file, run);
      if (!values)
        return fullPlan(`${file}: locale keys or placeholders changed.`);
      jobs.static = jobs.storybook = true;
      copy.push(...values);
      reasons.push(`${file}: copy only, runs locale checks and Storybook.`);
    } else return fullPlan(`${file}: shared or unclassified change.`);
  }

  if (copy.length) {
    const tracked =
      git(['ls-files', 'e2e', 'tests', 'src'], run)?.split('\n') ?? [];
    if (
      asserts(
        tracked.filter((file) => file.startsWith('e2e/')),
        copy,
        read,
      )
    ) {
      jobs.e2e = true;
      reasons.push('Browser tests assert changed copy, runs e2e.');
    }
    if (
      asserts(
        tracked.filter(
          (file) =>
            file.startsWith('tests/') || /\.test\.[cm]?[jt]sx?$/.test(file),
        ),
        copy,
        read,
      )
    ) {
      jobs.unit = true;
      reasons.push('Unit tests assert changed copy, runs unit tests.');
    }
  }
  if (!Object.values(jobs).some(Boolean)) reasons.push('Docs only.');
  return { jobs, reasons };
}
