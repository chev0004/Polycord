import { beforeEach, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { useActivityPages } from './ActivityPages';
import { pageCache } from './adminCache';
import type { ActivityPage } from './types';

const load = () => new Promise<ActivityPage<string>>(() => {});

const Probe = () => {
  const { loading, rows } = useActivityPages(load, true, 0, 'log');
  return <p data-loading={loading} data-rows={rows?.join(',')} />;
};

const cachePage = (rows: string[]) => {
  const day = new Date();
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  const range = { from: start.toISOString(), to: end.toISOString() };
  const page = { rows, nextCursor: null } as unknown as ActivityPage<string>;
  pageCache.set(JSON.stringify(['log', range, undefined, {}]), {
    at: Date.now(),
    request: Promise.resolve(page),
    page,
  });
};

beforeEach(() => pageCache.clear());

test('first render shows cached rows instead of loading', () => {
  cachePage(['a', 'b']);
  expect(renderToStaticMarkup(<Probe />)).toBe(
    '<p data-loading="false" data-rows="a,b"></p>',
  );
});

test('first render loads when nothing is cached', () => {
  expect(renderToStaticMarkup(<Probe />)).toBe('<p data-loading="true"></p>');
});
