import { rankProfiles, type ViewerMatchProfile } from './discoveryMatch';
import type { DiscoveryProfile } from './ProfileCard';

export const SORT_OPTIONS = [
  'match',
  'bumped-desc',
  'bumped-asc',
  'name-asc',
  'name-desc',
] as const;

export type DiscoverySortValue = (typeof SORT_OPTIONS)[number];

export const DEFAULT_SORT: DiscoverySortValue = 'bumped-desc';

const bumpRank = (profile: DiscoveryProfile): number =>
  profile.bumpedMinutesAgo ?? Number.POSITIVE_INFINITY;

export const applyDiscoverySort = (
  profiles: DiscoveryProfile[],
  sort: DiscoverySortValue,
  viewer?: ViewerMatchProfile | null,
): DiscoveryProfile[] => {
  const sorted = [...profiles];

  switch (sort) {
    case 'match':
      return viewer
        ? rankProfiles(viewer, sorted)
        : applyDiscoverySort(sorted, DEFAULT_SORT);
    case 'bumped-desc':
      return sorted.sort(
        (a, b) =>
          bumpRank(a) - bumpRank(b) ||
          a.displayName.localeCompare(b.displayName),
      );
    case 'bumped-asc':
      return sorted.sort(
        (a, b) =>
          bumpRank(b) - bumpRank(a) ||
          a.displayName.localeCompare(b.displayName),
      );
    case 'name-asc':
      return sorted.sort((a, b) => a.displayName.localeCompare(b.displayName));
    case 'name-desc':
      return sorted.sort((a, b) => b.displayName.localeCompare(a.displayName));
  }
};
