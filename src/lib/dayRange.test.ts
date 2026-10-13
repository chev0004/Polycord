import { describe, expect, test } from 'bun:test';
import { dayRangeIn } from './dayRange';

describe('dayRangeIn', () => {
  test('starts the day at local midnight', () => {
    const range = dayRangeIn('Asia/Tokyo', new Date('2026-10-12T20:00:00Z'));
    expect(range?.from.toISOString()).toBe('2026-10-12T15:00:00.000Z');
    expect(range?.to.toISOString()).toBe('2026-10-13T15:00:00.000Z');
  });

  test('uses the local date rather than the UTC date', () => {
    const range = dayRangeIn(
      'America/Los_Angeles',
      new Date('2026-10-12T03:00:00Z'),
    );
    expect(range?.from.toISOString()).toBe('2026-10-11T07:00:00.000Z');
  });

  test('spans a 23 hour day when clocks go forward', () => {
    const range = dayRangeIn(
      'America/New_York',
      new Date('2026-03-08T12:00:00Z'),
    );
    expect(range?.from.toISOString()).toBe('2026-03-08T05:00:00.000Z');
    expect(range?.to.toISOString()).toBe('2026-03-09T04:00:00.000Z');
  });

  test('rejects an unknown time zone', () => {
    expect(dayRangeIn('Not/AZone')).toBeNull();
  });
});
