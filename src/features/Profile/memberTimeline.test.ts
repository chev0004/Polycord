import { describe, expect, it } from 'bun:test';
import { buildDualDay } from './memberTimeline';

const evening = { days: 'any', from: '20:00', to: '23:00' } as const;
const morning = { days: 'any', from: '06:00', to: '09:00' } as const;

describe('buildDualDay', () => {
  it('centres on their window and aligns both clocks', () => {
    const day = buildDualDay({
      theirs: evening,
      yours: morning,
      offset: 14,
      theirHour: 5,
    });

    expect(day.ticks.map(({ top }) => top)).toEqual([
      '10',
      '16',
      '22',
      '04',
      '10',
    ]);
    expect(day.ticks.map(({ bottom }) => bottom)).toEqual([
      '20',
      '02',
      '08',
      '14',
      '20',
    ]);
    expect(day.theirs).toEqual([{ left: (10 / 24) * 100, width: 12.5 }]);
    expect(day.yours).toEqual(day.theirs);
    expect(day.overlapMinutes).toBe(180);
    expect(day.now).toBeCloseTo((19 / 24) * 100);
  });

  it('finds partial overlap across midnight', () => {
    const day = buildDualDay({
      theirs: { days: 'any', from: '22:00', to: '02:00' },
      yours: { days: 'any', from: '23:00', to: '01:00' },
      offset: 0,
      theirHour: 12,
    });

    expect(day.theirs).toHaveLength(1);
    expect(day.overlapMinutes).toBe(120);
  });

  it('fills the lane for any time', () => {
    const day = buildDualDay({
      theirs: { days: 'weekends', from: '', to: '', anyTime: true },
      yours: morning,
      offset: -9,
      theirHour: 0,
    });

    expect(day.theirs).toEqual([{ left: 0, width: 100 }]);
    expect(day.overlapMinutes).toBe(180);
  });

  it('has no overlap when the days never meet', () => {
    const day = buildDualDay({
      theirs: { ...evening, days: 'weekdays' },
      yours: { ...evening, days: 'weekends' },
      offset: 0,
      theirHour: 0,
    });

    expect(day.overlap).toEqual([]);
    expect(day.overlapMinutes).toBe(0);
  });

  it('handles missing availability on either side', () => {
    const noViewer = buildDualDay({ theirs: evening, offset: 3, theirHour: 0 });
    const noOwner = buildDualDay({ yours: morning, offset: 3, theirHour: 0 });
    const neither = buildDualDay({ offset: 0, theirHour: 6 });

    expect(noViewer.yours).toEqual([]);
    expect(noViewer.overlapMinutes).toBe(0);
    expect(noOwner.theirs).toEqual([]);
    expect(noOwner.yours).toEqual([{ left: (10 / 24) * 100, width: 12.5 }]);
    expect(neither.ticks.map(({ top }) => top)).toEqual([
      '00',
      '06',
      '12',
      '18',
      '00',
    ]);
    expect(neither.now).toBe(25);
  });
});
