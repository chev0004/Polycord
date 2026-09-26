import { afterEach, expect, test } from 'bun:test';
import { fmtHour } from './availability';

const OriginalDateTimeFormat = Intl.DateTimeFormat;

afterEach(() => {
  Intl.DateTimeFormat = OriginalDateTimeFormat;
});

test('falls back to a manual 12-hour string when Intl throws for h12', () => {
  Intl.DateTimeFormat = new Proxy(OriginalDateTimeFormat, {
    construct(target, args) {
      const [, options] = args as [
        string | undefined,
        Intl.DateTimeFormatOptions | undefined,
      ];
      if (options?.hourCycle === 'h12') {
        throw new RangeError('Invalid value for hourCycle');
      }
      return Reflect.construct(target, args);
    },
  }) as typeof Intl.DateTimeFormat;

  expect(fmtHour(18, 5, '12hr', 'en')).toBe('6:05 PM');
  expect(fmtHour(0, 30, '12hr', 'en')).toBe('12:30 AM');
  expect(fmtHour(12, 0, '12hr', 'en')).toBe('12:00 PM');
});
