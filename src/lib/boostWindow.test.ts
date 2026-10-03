import { describe, expect, test } from 'bun:test';
import {
  BOOST_DURATION_MS,
  boostAllowance,
  monthStart,
  nextMonthStart,
} from './boostWindow';

const at = (iso: string) => new Date(iso).getTime();

describe('boost month window', () => {
  test('starts and refills on the first of the month at midnight UTC', () => {
    const now = new Date('2026-10-31T23:59:59Z');
    expect(monthStart(now).toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(nextMonthStart(now).toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(nextMonthStart(new Date('2026-12-15T12:00:00Z')).toISOString()).toBe(
      '2027-01-01T00:00:00.000Z',
    );
  });
});

describe('boost allowance tiles', () => {
  const now = at('2026-10-10T12:00:00Z');
  const idle = { total: 3, boostedUntil: 0, now };

  test('all ready before any boost', () => {
    expect(boostAllowance({ ...idle, remaining: 3 })).toEqual({
      ready: 3,
      live: 0,
      used: 0,
    });
  });

  test('spent boosts show as used', () => {
    expect(boostAllowance({ ...idle, remaining: 1 })).toEqual({
      ready: 1,
      live: 0,
      used: 2,
    });
  });

  test('a running boost started this month is live', () => {
    expect(
      boostAllowance({
        total: 3,
        remaining: 1,
        boostedUntil: now + 3600000,
        now,
      }),
    ).toEqual({ ready: 1, live: 1, used: 1 });
  });

  test('the final allowance running leaves nothing ready', () => {
    expect(
      boostAllowance({
        total: 3,
        remaining: 0,
        boostedUntil: now + 3600000,
        now,
      }),
    ).toEqual({ ready: 0, live: 1, used: 2 });
  });

  test('an expired boost becomes used', () => {
    expect(
      boostAllowance({
        total: 3,
        remaining: 2,
        boostedUntil: now - 1,
        now,
      }),
    ).toEqual({ ready: 2, live: 0, used: 1 });
  });

  test('a boost spanning the month boundary does not use a new-month boost', () => {
    const boundary = at('2026-11-01T00:00:00Z');
    const boostedUntil = boundary + BOOST_DURATION_MS - 3600000;
    expect(
      boostAllowance({
        total: 3,
        remaining: 3,
        boostedUntil,
        now: boundary + 60000,
      }),
    ).toEqual({ ready: 3, live: 0, used: 0 });
  });
});
