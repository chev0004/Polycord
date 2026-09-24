import {
  type AvailabilityPattern,
  parseHhMm,
  tzOffsetMinutes,
} from '@/constants/availability';
import { isValidIANATimezone } from '@/constants/languages';

const MINUTES_PER_DAY = 1440;
const MINUTES_PER_WEEK = 10080;

export const MEANINGFUL_OVERLAP_MINUTES = 30;

export type AvailabilityContext = {
  availability?: AvailabilityPattern | null;
  timezone?: string;
};

type Interval = { start: number; end: number };

const daysForBucket = (days: AvailabilityPattern['days']): number[] => {
  if (days === 'weekdays') return [1, 2, 3, 4, 5];
  if (days === 'weekends') return [0, 6];
  return [0, 1, 2, 3, 4, 5, 6];
};

const windowLength = (pattern: AvailabilityPattern): number => {
  if (pattern.anyTime) return MINUTES_PER_DAY;
  const from = parseHhMm(pattern.from);
  const to = parseHhMm(pattern.to);
  return (to - from + MINUTES_PER_DAY) % MINUTES_PER_DAY || 0;
};

const pushWrapped = (out: Interval[], startMinute: number, length: number) => {
  let start =
    ((startMinute % MINUTES_PER_WEEK) + MINUTES_PER_WEEK) % MINUTES_PER_WEEK;
  let remaining = length;

  while (remaining > 0) {
    const segment = Math.min(remaining, MINUTES_PER_WEEK - start);
    out.push({ start, end: start + segment });
    remaining -= segment;
    start = 0;
  }
};

const mergeIntervals = (intervals: Interval[]): Interval[] => {
  if (intervals.length <= 1) return intervals;

  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
};

const toUtcWeekIntervals = (context: AvailabilityContext): Interval[] => {
  const { availability, timezone } = context;
  if (!availability || !timezone || !isValidIANATimezone(timezone)) return [];

  const length = windowLength(availability);
  if (length <= 0) return [];

  const offset = tzOffsetMinutes(timezone);
  const fromMinute = availability.anyTime ? 0 : parseHhMm(availability.from);
  const intervals: Interval[] = [];

  for (const day of daysForBucket(availability.days)) {
    const localStart = day * MINUTES_PER_DAY + fromMinute;
    pushWrapped(intervals, localStart - offset, length);
  }

  return mergeIntervals(intervals);
};

const intersectionMinutes = (a: Interval[], b: Interval[]): number => {
  let total = 0;
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    const start = Math.max(a[i].start, b[j].start);
    const end = Math.min(a[i].end, b[j].end);
    if (end > start) total += end - start;
    if (a[i].end < b[j].end) i += 1;
    else j += 1;
  }

  return total;
};

const currentWeekMinuteUtc = (now: Date): number =>
  now.getUTCDay() * MINUTES_PER_DAY +
  now.getUTCHours() * 60 +
  now.getUTCMinutes();

export const overlapMinutes = (
  viewer: AvailabilityContext,
  candidate: AvailabilityContext,
): number =>
  intersectionMinutes(
    toUtcWeekIntervals(viewer),
    toUtcWeekIntervals(candidate),
  );

export const isAvailableNow = (
  candidate: AvailabilityContext,
  now: Date = new Date(),
): boolean => {
  const intervals = toUtcWeekIntervals(candidate);
  if (intervals.length === 0) return false;

  const minute = currentWeekMinuteUtc(now);
  return intervals.some(
    (interval) => minute >= interval.start && minute < interval.end,
  );
};
