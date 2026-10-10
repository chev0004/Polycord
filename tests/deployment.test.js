import { afterEach, beforeEach, expect, test } from 'bun:test';
import {
  claimBuildReload,
  claimChunkReload,
  isChunkLoadFailure,
} from '../src/lib/deployment';
import {
  hasUnsavedChanges,
  onUnsavedChanges,
  setUnsavedChanges,
} from '../src/lib/unsavedChanges';

const original = globalThis.sessionStorage;

beforeEach(() => {
  const store = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
  };
});

afterEach(() => {
  globalThis.sessionStorage = original;
});

test('lazy chunk and module failures are recognised', () => {
  const chunk = new Error('Loading chunk 412 failed.');
  chunk.name = 'ChunkLoadError';
  expect(isChunkLoadFailure(chunk)).toBe(true);
  expect(isChunkLoadFailure('Loading CSS chunk app/layout failed')).toBe(true);
  expect(
    isChunkLoadFailure(
      new TypeError('Failed to fetch dynamically imported module: /x.js'),
    ),
  ).toBe(true);
  expect(isChunkLoadFailure(new Error('Network request failed'))).toBe(false);
  expect(isChunkLoadFailure(undefined)).toBe(false);
});

test('a chunk failure reloads once inside the recovery window', () => {
  expect(claimChunkReload()).toBe(true);
  expect(claimChunkReload()).toBe(false);
});

test('a build reload is claimed once per server build', () => {
  expect(claimBuildReload('abc')).toBe(true);
  expect(claimBuildReload('abc')).toBe(false);
  expect(claimBuildReload('def')).toBe(true);
});

test('reloads are refused when storage cannot remember them', () => {
  globalThis.sessionStorage = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };
  expect(claimChunkReload()).toBe(false);
  expect(claimBuildReload('abc')).toBe(false);
});

test('unsaved changes are tracked per form and announced', () => {
  const seen = [];
  const stop = onUnsavedChanges(() => seen.push(hasUnsavedChanges()));
  setUnsavedChanges('a', true);
  setUnsavedChanges('a', true);
  setUnsavedChanges('b', true);
  setUnsavedChanges('a', false);
  expect(hasUnsavedChanges()).toBe(true);
  setUnsavedChanges('b', false);
  setUnsavedChanges('b', false);
  expect(seen).toEqual([true, true, true, false]);
  stop();
  setUnsavedChanges('c', true);
  setUnsavedChanges('c', false);
  expect(seen).toHaveLength(4);
});
