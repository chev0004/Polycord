import { describe, expect, it } from 'bun:test';
import { applyDiscoverySearch } from './discoverySearch';
import { applyDiscoverySort } from './discoverySort';
import type { DiscoveryProfile } from './ProfileCard';

const profile = (overrides: Partial<DiscoveryProfile>): DiscoveryProfile => ({
  id: 'profile-1',
  displayName: 'Yuki',
  discordUsername: 'yuki_lang',
  primaryLanguage: 'ja',
  targetLanguages: [{ language: 'en', level: 'advanced' }],
  interests: [],
  ...overrides,
});

const yuki = profile({
  id: 'yuki',
  displayName: 'Yuki',
  interests: ['Anime'],
  about: 'Preparing for the IELTS exam.',
});
const carlos = profile({
  id: 'carlos',
  displayName: 'Carlos',
  discordUsername: 'carlos_ba',
  primaryLanguage: 'es',
  targetLanguages: [{ language: 'en', level: 'intermediate' }],
  interests: ['Football'],
});

describe('applyDiscoverySearch', () => {
  it('returns everything for an empty query', () => {
    expect(applyDiscoverySearch([yuki, carlos], '   ', 'en')).toHaveLength(2);
  });

  it('matches display names case-insensitively', () => {
    expect(applyDiscoverySearch([yuki, carlos], 'CARLOS', 'en')).toEqual([
      carlos,
    ]);
  });

  it('matches localized language names', () => {
    expect(applyDiscoverySearch([yuki, carlos], 'spanish', 'en')).toEqual([
      carlos,
    ]);
    expect(applyDiscoverySearch([yuki, carlos], 'スペイン語', 'ja')).toEqual([
      carlos,
    ]);
  });

  it('matches interests and bio text', () => {
    expect(applyDiscoverySearch([yuki, carlos], 'football', 'en')).toEqual([
      carlos,
    ]);
    expect(applyDiscoverySearch([yuki, carlos], 'ielts', 'en')).toEqual([yuki]);
  });

  it('returns nothing for an unmatched query', () => {
    expect(applyDiscoverySearch([yuki, carlos], 'zzzz', 'en')).toHaveLength(0);
  });
});

describe('applyDiscoverySort', () => {
  const recentlyBumped = profile({
    id: 'recent',
    displayName: 'Recent',
    bumpedMinutesAgo: 5,
  });
  const staleBump = profile({
    id: 'stale',
    displayName: 'Stale',
    bumpedMinutesAgo: 900,
  });
  const neverBumped = profile({ id: 'never', displayName: 'Never' });

  it('sorts by most recent bump by default order', () => {
    const sorted = applyDiscoverySort(
      [neverBumped, staleBump, recentlyBumped],
      'bumped-desc',
    );

    expect(sorted.map((entry) => entry.id)).toEqual([
      'recent',
      'stale',
      'never',
    ]);
  });

  it('sorts by name in both directions', () => {
    const byName = applyDiscoverySort([staleBump, recentlyBumped], 'name-asc');

    expect(byName.map((entry) => entry.displayName)).toEqual([
      'Recent',
      'Stale',
    ]);

    const reversed = applyDiscoverySort(
      [recentlyBumped, staleBump],
      'name-desc',
    );

    expect(reversed.map((entry) => entry.displayName)).toEqual([
      'Stale',
      'Recent',
    ]);
  });

  it('does not mutate the input array', () => {
    const input = [staleBump, recentlyBumped];
    applyDiscoverySort(input, 'bumped-desc');

    expect(input.map((entry) => entry.id)).toEqual(['stale', 'recent']);
  });
});
