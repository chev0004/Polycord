import { afterEach, expect, test } from 'bun:test';
import {
  loadDayCounts,
  peekDayCounts,
  peekFreshDayCounts,
  staleDayCounts,
} from './adminCache';

const realFetch = globalThis.fetch;
const month = new Date(2026, 0, 1);

afterEach(() => {
  globalThis.fetch = realFetch;
});

test('stale day counts are peekable but not fresh', async () => {
  globalThis.fetch = (() =>
    Promise.resolve(
      Response.json({ days: { '2026-01-05': 0 } }),
    )) as unknown as typeof fetch;
  await loadDayCounts('log', month);
  expect(peekFreshDayCounts('log', month)).toEqual({
    '2026-01-05': 0,
  });
  staleDayCounts();
  expect(peekFreshDayCounts('log', month)).toBeUndefined();
  expect(peekDayCounts('log', month)).toEqual({ '2026-01-05': 0 });
});
