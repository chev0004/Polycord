import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { planChanges } from './ci-plan.mjs';

const originalCwd = process.cwd();
const git = (...args) =>
  spawnSync('git', args, { encoding: 'utf8' }).stdout.trim();
const locale = (profile, extra = {}) =>
  `${JSON.stringify({ Settings: { profileViewAlertDescriptionFree: profile, save: 'Save {count} items', ...extra } }, null, 2)}\n`;

async function commit(files) {
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
  git('add', '-A');
  git('commit', '-qm', 'change');
  return git('rev-parse', 'HEAD');
}

const running = (plan) =>
  Object.entries(plan.jobs)
    .filter(([, runs]) => runs)
    .map(([job]) => job);
const full = ['static', 'unit', 'package', 'e2e', 'storybook'];

let base;
beforeEach(async () => {
  process.chdir(await mkdtemp(join(tmpdir(), 'polycord-ci-plan-')));
  git('init', '-q');
  git('config', 'user.email', 'ci@example.invalid');
  git('config', 'user.name', 'ci');
  base = await commit({
    'src/app.ts': 'a',
    'src/Button.stories.tsx': 'a',
    'src/locales/en.json': locale('Alert me when someone views my profile.'),
    'e2e/settings.pw.ts': "await page.getByText('Open settings');",
    'scripts/tickets.ts': 'a',
    'bun.lock': 'a',
  });
});

afterEach(() => process.chdir(originalCwd));

test('docs-only changes run nothing', async () => {
  const head = await commit({ 'README.md': 'b', 'docs/guide.md': 'b' });
  const plan = planChanges(base, head);
  assert.deepEqual(running(plan), []);
  assert.deepEqual(plan.reasons, ['Docs only.']);
});

test('isolated stories run static checks and Storybook', async () => {
  const head = await commit({
    'src/Button.stories.tsx': 'b',
    'docs/a.md': 'b',
  });
  assert.deepEqual(running(planChanges(base, head)), ['static', 'storybook']);
});

test('value-only copy runs locale checks and Storybook', async () => {
  const head = await commit({
    'src/locales/en.json': locale('Get profile view alerts with Supporter.'),
  });
  const plan = planChanges(base, head);
  assert.deepEqual(running(plan), ['static', 'storybook']);
  assert.match(plan.reasons[0], /copy only/);
});

test('mapped copy asserted in browser tests runs e2e', async () => {
  const message = (title) => JSON.stringify({ Admin: { dismissTitle: title } });
  const from = await commit({
    'src/locales/en.json': message(
      'Dismiss {count, plural, one {report} other {# reports}}?',
    ),
  });
  const head = await commit({
    'src/locales/en.json': message(
      'Dismiss {count, plural, one {this report} other {# reported profiles}}?',
    ),
  });
  assert.deepEqual(running(planChanges(from, head)), [
    'static',
    'e2e',
    'storybook',
  ]);
  const changedRule = await commit({
    'src/locales/en.json': message(
      'Dismiss {count, plural, =0 {this report} other {# reported profiles}}?',
    ),
  });
  assert.deepEqual(running(planChanges(head, changedRule)), full);
});

test('copy without an explicit coverage mapping uses full CI', async () => {
  const head = await commit({
    'src/locales/en.json': locale('Alert me when someone views my profile.', {
      save: 'Save all {count} items',
    }),
  });
  assert.deepEqual(running(planChanges(base, head)), full);
});

test('copy with changed keys or placeholders runs the full suite', async () => {
  const keys = await commit({
    'src/locales/en.json': locale('Alert me when someone views my profile.', {
      added: 'New',
    }),
  });
  assert.deepEqual(running(planChanges(base, keys)), full);
  const placeholder = await commit({
    'src/locales/en.json': `${JSON.stringify({ Settings: { profileViewAlertDescriptionFree: 'Alert me when someone views my profile.', save: 'Save {total} items' } }, null, 2)}\n`,
  });
  assert.deepEqual(running(planChanges(keys, placeholder)), full);
});

test('isolated tooling runs only static checks', async () => {
  const head = await commit({ 'scripts/tickets.ts': 'b' });
  assert.deepEqual(running(planChanges(base, head)), ['static']);
});

test('local dev tools run static and unit checks', async () => {
  const head = await commit({
    'scripts/locale-review/review-state.ts': 'b',
    'scripts/locale-review/reviewer.css': 'b',
  });
  assert.deepEqual(running(planChanges(base, head)), ['static', 'unit']);
});

test('shared source, migrations and lockfiles run the full suite', async () => {
  for (const file of ['src/app.ts', 'drizzle/0041_add.sql', 'bun.lock']) {
    const head = await commit({ [file]: `${file} changed` });
    const plan = planChanges(base, head);
    assert.deepEqual(running(plan), full, file);
    assert.match(plan.reasons[0], new RegExp(file.replace('.', '\\.')));
  }
});

test('mixed changes run the full suite unless every file is proven', async () => {
  const mixed = await commit({
    'src/Button.stories.tsx': 'c',
    'src/app.ts': 'c',
  });
  assert.deepEqual(running(planChanges(base, mixed)), full);
  const proven = await commit({
    'src/Button.stories.tsx': 'd',
    'src/locales/en.json': locale('Get profile view alerts with Supporter.'),
    'scripts/tickets.ts': 'd',
  });
  assert.deepEqual(running(planChanges(mixed, proven)), [
    'static',
    'storybook',
  ]);
});

test('a source file renamed into a story runs the full suite', async () => {
  git('mv', 'src/app.ts', 'src/App.stories.tsx');
  git('commit', '-qm', 'rename');
  assert.deepEqual(running(planChanges(base, git('rev-parse', 'HEAD'))), full);
});

test('an unavailable diff runs the full suite', () => {
  const plan = planChanges(base, 'f'.repeat(40));
  assert.deepEqual(running(plan), full);
  assert.match(plan.reasons[0], /unavailable/);
});
