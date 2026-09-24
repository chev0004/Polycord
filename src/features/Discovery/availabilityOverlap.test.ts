import { expect, test } from 'bun:test';
import { isAvailableNow, overlapMinutes } from './availabilityOverlap';

const evening = { days: 'any', from: '18:00', to: '19:00' } as const;
const tokyo = { availability: evening, timezone: 'Asia/Tokyo' };
const utcMorning = {
  availability: { ...evening, from: '09:00', to: '10:00' },
  timezone: 'UTC',
};

test('compares local schedules in their actual timezones', () => {
  expect(overlapMinutes(tokyo, utcMorning)).toBe(420);
  expect(overlapMinutes(tokyo, { ...tokyo, timezone: 'UTC' })).toBe(0);
  expect(isAvailableNow(tokyo, new Date('2026-09-22T09:30:00Z'))).toBe(true);
});

test('hidden, missing and invalid timezones never become UTC', () => {
  for (const timezone of [undefined, '', 'not/a-timezone']) {
    const candidate = { ...tokyo, timezone };
    expect(overlapMinutes(candidate, { ...tokyo, timezone: 'UTC' })).toBe(0);
    expect(isAvailableNow(candidate, new Date('2026-09-22T18:30:00Z'))).toBe(
      false,
    );
  }
});
