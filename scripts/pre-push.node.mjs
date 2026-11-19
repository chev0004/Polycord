import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { needsChecks } from './pre-push.mjs';

const originalCwd = process.cwd();
const zero = '0'.repeat(40);
const git = (...args) =>
  spawnSync('git', args, { encoding: 'utf8' }).stdout.trim();

async function commit(files) {
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
  git('add', '-A');
  git('commit', '-qm', 'change');
  return git('rev-parse', 'HEAD');
}

const line = (local, remote) =>
  `refs/heads/topic ${local} refs/heads/topic ${remote}\n`;

let base;
beforeEach(async () => {
  process.chdir(await mkdtemp(join(tmpdir(), 'polycord-pre-push-')));
  git('init', '-q');
  git('config', 'user.email', 'ci@example.invalid');
  git('config', 'user.name', 'ci');
  base = await commit({ 'src/app.ts': 'a' });
  git('update-ref', 'refs/remotes/origin/develop', base);
});

afterEach(() => process.chdir(originalCwd));

test('a docs-only push skips the full check', async () => {
  const head = await commit({ 'docs/a.md': 'a', 'README.md': 'a' });
  assert.equal(needsChecks(line(head, base)), false);
});

test('a code push runs the full check', async () => {
  const head = await commit({ 'src/app.ts': 'b' });
  assert.equal(needsChecks(line(head, base)), true);
});

test('a story-only push still runs the static checks', async () => {
  const head = await commit({ 'src/A.stories.tsx': 'a' });
  assert.equal(needsChecks(line(head, base)), true);
});

test('a new branch compares against develop', async () => {
  const docs = await commit({ 'docs/a.md': 'a' });
  assert.equal(needsChecks(line(docs, zero)), false);
  const code = await commit({ 'src/app.ts': 'c' });
  assert.equal(needsChecks(line(code, zero)), true);
});

test('a new branch without a develop base runs the full check', async () => {
  git('update-ref', '-d', 'refs/remotes/origin/develop');
  const head = await commit({ 'docs/a.md': 'a' });
  assert.equal(needsChecks(line(head, zero)), true);
});

test('deletes need no check and multi-ref pushes check every ref', async () => {
  const docs = await commit({ 'docs/a.md': 'a' });
  assert.equal(needsChecks(line(zero, base)), false);
  assert.equal(needsChecks(''), false);
  const code = await commit({ 'src/app.ts': 'd' });
  assert.equal(
    needsChecks(`${line(zero, base)}${line(docs, base)}${line(code, docs)}`),
    true,
  );
});

test('an unknown remote revision runs the full check', async () => {
  const head = await commit({ 'docs/a.md': 'a' });
  assert.equal(needsChecks(line(head, 'f'.repeat(40))), true);
});
