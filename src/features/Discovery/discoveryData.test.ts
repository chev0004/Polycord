import { describe, expect, it } from 'bun:test';
import { discoveryGroupSizes, planDiscoveryGroups } from './discoveryData';

describe('planDiscoveryGroups', () => {
  it('fills groups from the bump stream without boosts', () => {
    expect(discoveryGroupSizes([], 20)).toEqual([9, 9, 2]);
  });

  it('keeps a boosted profile once within its own group', () => {
    expect(planDiscoveryGroups([0, 19, 18], 30)[0]).toEqual({
      boosts: 3,
      bumpStart: 0,
      bumpEnd: 7,
      size: 9,
    });
  });

  it('shifts later groups by the skipped profiles', () => {
    expect(
      planDiscoveryGroups([0, 19, 18], 30).map((g) => g.bumpStart),
    ).toEqual([0, 7, 16, 25]);
    expect(discoveryGroupSizes([0, 19, 18], 30)).toEqual([9, 9, 9, 5]);
  });

  it('keeps repeats across different groups', () => {
    expect(discoveryGroupSizes([20, 19, 18, 17, 16, 0], 30)).toEqual([
      9, 9, 9, 9,
    ]);
  });

  it('skips adjacent repeats and stops when the bump stream ends', () => {
    expect(discoveryGroupSizes([0, 1, 2, 3, 4, 5, 6, 7, 8], 9)).toEqual([
      9, 3, 3,
    ]);
  });
});
