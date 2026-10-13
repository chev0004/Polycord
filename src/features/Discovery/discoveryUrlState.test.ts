import { describe, expect, it } from 'bun:test';
import { buildDiscoveryQuery, parseDiscoveryState } from './discoveryUrlState';

describe('voice intro filter url state', () => {
  it('round trips the voice param with the other filters', () => {
    const state = parseDiscoveryState(
      new URLSearchParams('voice=yes&avail=available-now&primary=ja&page=3'),
    );

    expect(state.filterValues).toEqual({
      primaryLanguage: ['ja'],
      availability: 'available-now',
      voiceIntro: 'yes',
    });
    expect(
      parseDiscoveryState(new URLSearchParams(buildDiscoveryQuery(state))),
    ).toEqual(state);
  });

  it('drops the voice param once the filter is cleared', () => {
    const state = parseDiscoveryState(new URLSearchParams('voice=yes'));
    const cleared = { ...state, filterValues: {}, page: 1 };

    expect(buildDiscoveryQuery(cleared, new URLSearchParams('voice=yes'))).toBe(
      '',
    );
  });
});
