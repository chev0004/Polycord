import { expect, test } from 'bun:test';
import { formatAvailability } from './availability';

const pattern = { days: 'any', from: '18:00', to: '22:00' } as const;

const labels = {
  days: { any: 'Any day', weekdays: 'Weekdays', weekends: 'Weekends' },
  anyTime: 'Any time',
  to: 'to',
  viewerSuffix: 'your time',
};

test('requires an owner timezone before formatting a schedule', () => {
  expect(formatAvailability(pattern, undefined, 'UTC', labels)).toBeNull();
  expect(formatAvailability(pattern, '', 'UTC', labels)).toBeNull();
  expect(
    formatAvailability({ ...pattern, anyTime: true }, undefined, 'UTC', labels),
  ).toBeNull();
});

test('formats the owner schedule once an owner timezone is set', () => {
  const result = formatAvailability(pattern, 'UTC', undefined, labels);
  expect(result).not.toBeNull();
  expect(result?.viewerStr).toBeNull();
});

test('adds a viewer conversion only once both timezones are known', () => {
  const result = formatAvailability(pattern, 'UTC', 'Asia/Tokyo', labels);
  expect(result?.viewerStr).toContain('your time');
});
