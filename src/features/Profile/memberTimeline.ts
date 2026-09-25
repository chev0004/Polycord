import { type AvailabilityPattern, parseHhMm } from '@/constants/availability';

const SLOTS = 96;

export type TimelineRun = { left: number; width: number };

const windowOf = (pattern: AvailabilityPattern) => {
  const from = pattern.anyTime ? 0 : parseHhMm(pattern.from) / 60;
  const length = pattern.anyTime
    ? 24
    : (parseHhMm(pattern.to) / 60 - from + 24) % 24 || 24;
  return { from, length };
};

const toSlots = (pattern: AvailabilityPattern | undefined, shift: number) => {
  const slots = Array<boolean>(SLOTS).fill(false);
  if (!pattern) return slots;
  const { from, length } = windowOf(pattern);
  const first = Math.round((from + shift) * 4);
  for (let slot = 0; slot < length * 4; slot++) {
    slots[(((first + slot) % SLOTS) + SLOTS) % SLOTS] = true;
  }
  return slots;
};

const toRuns = (slots: boolean[]) => {
  const runs: TimelineRun[] = [];
  let start = -1;
  for (let slot = 0; slot <= SLOTS; slot++) {
    if (slot < SLOTS && slots[slot]) {
      if (start < 0) start = slot;
    } else if (start >= 0) {
      runs.push({
        left: (start / SLOTS) * 100,
        width: ((slot - start) / SLOTS) * 100,
      });
      start = -1;
    }
  }
  return runs;
};

const hourLabel = (hour: number) =>
  String(Math.floor(((hour % 24) + 24) % 24)).padStart(2, '0');

const sharesDays = (a: AvailabilityPattern, b: AvailabilityPattern) =>
  a.days === 'any' || b.days === 'any' || a.days === b.days;

export const buildDualDay = ({
  theirs,
  yours,
  offset,
  theirHour,
}: {
  theirs?: AvailabilityPattern;
  yours?: AvailabilityPattern;
  offset: number;
  theirHour: number;
}) => {
  const anchor = theirs ?? yours;
  const anchorWindow = anchor ? windowOf(anchor) : null;
  const middle = anchorWindow
    ? anchorWindow.from + anchorWindow.length / 2 + (theirs ? 0 : offset)
    : 12;
  const start = (((Math.round(middle - 12) % 24) + 24) % 24) * 4;
  const rotate = (slots: boolean[]) =>
    slots.map((_, slot) => slots[(slot + start) % SLOTS]);
  const them = rotate(toSlots(theirs, 0));
  const you = rotate(toSlots(yours, offset));
  const both =
    theirs && yours && sharesDays(theirs, yours)
      ? them.map((free, slot) => free && you[slot])
      : [];

  return {
    ticks: [0, 6, 12, 18, 24].map((tick) => ({
      hour: tick + start / 4,
      top: hourLabel(tick + start / 4),
      bottom: hourLabel(tick + start / 4 - offset),
    })),
    theirs: toRuns(them),
    yours: toRuns(you),
    overlap: toRuns(both),
    overlapMinutes: both.filter(Boolean).length * 15,
    now: (((((theirHour - start / 4) % 24) + 24) % 24) / 24) * 100,
  };
};
