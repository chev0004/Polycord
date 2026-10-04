import { expect, test } from 'bun:test';
import { grantExpiry, isValidGrant, premiumGrantSchema } from './premiumGrant';

const at = (iso: string) => new Date(iso);

test('adds whole weeks to the exact grant time', () => {
  expect(grantExpiry(at('2026-09-28T10:15:00Z'), 2, 'weeks')).toEqual(
    at('2026-10-12T10:15:00Z'),
  );
});

test('keeps the day of month when it exists in the target month', () => {
  expect(grantExpiry(at('2026-09-28T10:15:00Z'), 1, 'months')).toEqual(
    at('2026-10-28T10:15:00Z'),
  );
  expect(grantExpiry(at('2026-09-28T10:15:00Z'), 6, 'months')).toEqual(
    at('2027-03-28T10:15:00Z'),
  );
});

test('clamps month ends to the last day of shorter months', () => {
  expect(grantExpiry(at('2026-01-31T12:00:00Z'), 1, 'months')).toEqual(
    at('2026-02-28T12:00:00Z'),
  );
  expect(grantExpiry(at('2028-01-31T12:00:00Z'), 1, 'months')).toEqual(
    at('2028-02-29T12:00:00Z'),
  );
  expect(grantExpiry(at('2026-08-31T12:00:00Z'), 1, 'months')).toEqual(
    at('2026-09-30T12:00:00Z'),
  );
  expect(grantExpiry(at('2026-12-31T12:00:00Z'), 2, 'months')).toEqual(
    at('2027-02-28T12:00:00Z'),
  );
});

test('moves a leap day grant to February 28 in common years', () => {
  expect(grantExpiry(at('2028-02-29T09:00:00Z'), 1, 'years')).toEqual(
    at('2029-02-28T09:00:00Z'),
  );
  expect(grantExpiry(at('2028-02-29T09:00:00Z'), 4, 'years')).toEqual(
    at('2032-02-29T09:00:00Z'),
  );
  expect(grantExpiry(at('2026-09-28T10:15:00Z'), 2, 'years')).toEqual(
    at('2028-09-28T10:15:00Z'),
  );
});

test('accepts only whole positive amounts within each unit limit', () => {
  expect(isValidGrant(2, 'weeks')).toBe(true);
  expect(isValidGrant(52, 'weeks')).toBe(true);
  expect(isValidGrant(53, 'weeks')).toBe(false);
  expect(isValidGrant(24, 'months')).toBe(true);
  expect(isValidGrant(25, 'months')).toBe(false);
  expect(isValidGrant(5, 'years')).toBe(true);
  expect(isValidGrant(6, 'years')).toBe(false);
  expect(isValidGrant(0, 'months')).toBe(false);
  expect(isValidGrant(-1, 'months')).toBe(false);
  expect(isValidGrant(1.5, 'months')).toBe(false);
  expect(isValidGrant(Number.NaN, 'months')).toBe(false);
});

test('validates grant requests', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  expect(
    premiumGrantSchema.safeParse({ userId, amount: 6, unit: 'months' }).success,
  ).toBe(true);
  expect(
    premiumGrantSchema.safeParse({ userId, amount: 0, unit: 'months' }).success,
  ).toBe(false);
  expect(
    premiumGrantSchema.safeParse({ userId, amount: 3, unit: 'days' }).success,
  ).toBe(false);
  expect(
    premiumGrantSchema.safeParse({ userId: 'x', amount: 3, unit: 'weeks' })
      .success,
  ).toBe(false);
});
