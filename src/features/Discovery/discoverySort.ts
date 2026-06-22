import { computeProfileCompleteness } from '@/lib/profileCompleteness';
import {
  type AvailabilityContext,
  overlapMinutes,
} from './availabilityOverlap';
import type { DiscoveryProfile } from './ProfileCard';

export const SORT_OPTIONS = [
  'bumped-desc',
  'bumped-asc',
  'name-asc',
  'name-desc',
  'overlap-desc',
  'complete-desc',
] as const;

export type DiscoverySortValue = (typeof SORT_OPTIONS)[number];

export const DEFAULT_SORT: DiscoverySortValue = 'bumped-desc';

const completenessScore = (profile: DiscoveryProfile): number =>
  computeProfileCompleteness({
    primaryLanguage: profile.primaryLanguage,
    targetLanguages: profile.targetLanguages,
    bio: profile.about,
    availability: profile.availability,
    tags: profile.interests,
    country: profile.country,
  }).score;

const bumpRank = (profile: DiscoveryProfile): number =>
  profile.bumpedMinutesAgo ??
  (profile.lastBumpedAt
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(profile.lastBumpedAt).getTime()) / 60000,
        ),
      )
    : Number.POSITIVE_INFINITY);

export const applyDiscoverySort = (
  profiles: DiscoveryProfile[],
  sort: DiscoverySortValue,
  viewer?: AvailabilityContext,
): DiscoveryProfile[] => {
  const sorted = [...profiles];

  switch (sort) {
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
    case 'overlap-desc': {
      const overlap = new Map(
        sorted.map((profile) => [
          profile.id,
          viewer
            ? overlapMinutes(viewer, {
                availability: profile.availability,
                timezone: profile.timezone,
              })
            : 0,
        ]),
      );
      return sorted.sort(
        (a, b) =>
          (overlap.get(b.id) ?? 0) - (overlap.get(a.id) ?? 0) ||
          bumpRank(a) - bumpRank(b) ||
          a.displayName.localeCompare(b.displayName),
      );
    }
    case 'complete-desc':
      return sorted.sort(
        (a, b) =>
          completenessScore(b) - completenessScore(a) ||
          bumpRank(a) - bumpRank(b) ||
          a.displayName.localeCompare(b.displayName),
      );
  }
};
