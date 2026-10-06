import { describe, expect, test } from 'bun:test';
import {
  ACTIVITY_PAGE_SIZE,
  pageOf,
  parseActivityWindow,
} from './activityWindow';

const params = (values: Record<string, string>) => new URLSearchParams(values);
const id = '2f1c7a52-8a43-4b79-9a8f-0f2b6b0a1c11';

describe('parseActivityWindow', () => {
  test('accepts a calendar day and a cursor', () => {
    const window = parseActivityWindow(
      params({
        from: '2026-10-05T00:00:00.000Z',
        to: '2026-10-06T00:00:00.000Z',
        cursor: `2026-10-05T12:30:00.123456Z|${id}`,
      }),
    );
    expect(window?.from.toISOString()).toBe('2026-10-05T00:00:00.000Z');
    expect(window?.to.toISOString()).toBe('2026-10-06T00:00:00.000Z');
    expect(window?.cursor).toEqual({ at: '2026-10-05T12:30:00.123456Z', id });
  });

  test('accepts a 25 hour daylight saving day', () => {
    expect(
      parseActivityWindow(
        params({
          from: '2026-11-01T04:00:00.000Z',
          to: '2026-11-02T05:00:00.000Z',
        }),
      ),
    ).not.toBeNull();
  });

  test.each([
    ['missing range', {}],
    [
      'reversed range',
      { from: '2026-10-06T00:00:00Z', to: '2026-10-05T00:00:00Z' },
    ],
    [
      'range over a day',
      { from: '2026-10-01T00:00:00Z', to: '2026-10-05T00:00:00Z' },
    ],
    ['bad dates', { from: 'yesterday', to: 'today' }],
    [
      'bad cursor',
      { from: '2026-10-05T00:00:00Z', to: '2026-10-06T00:00:00Z', cursor: 'x' },
    ],
  ])('rejects %s', (_name, values) => {
    expect(parseActivityWindow(params(values))).toBeNull();
  });
});

describe('pageOf', () => {
  const rows = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      id: `id-${index}`,
      cursorAt: `at-${index}`,
    }));

  test('stops at the page size and cursors from the last visible row', () => {
    const { page, nextCursor } = pageOf(rows(ACTIVITY_PAGE_SIZE + 1));
    expect(page).toHaveLength(ACTIVITY_PAGE_SIZE);
    expect(nextCursor).toBe(
      `at-${ACTIVITY_PAGE_SIZE - 1}|id-${ACTIVITY_PAGE_SIZE - 1}`,
    );
  });

  test('has no cursor on the final page', () => {
    expect(pageOf(rows(ACTIVITY_PAGE_SIZE)).nextCursor).toBeUndefined();
    expect(pageOf([]).nextCursor).toBeUndefined();
  });
});
