import type { DiscoveryProfile } from './ProfileCard';

export type DiscoveryTagCount = {
  tag: string;
  count: number;
};

// Tags actually in use across the profiles, ordered by usage then alphabetical.
export const buildTagCounts = (
  profiles: DiscoveryProfile[],
): DiscoveryTagCount[] => {
  const counts = new Map<string, number>();

  for (const profile of profiles) {
    for (const tag of profile.interests) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort(
      ([tagA, countA], [tagB, countB]) =>
        countB - countA || tagA.localeCompare(tagB),
    )
    .map(([tag, count]) => ({ tag, count }));
};

// Narrows profiles to those carrying every selected tag, combining with the
// other discovery filters. Same value shape DISC-002 will send to the server.
export const applyTagFilter = (
  profiles: DiscoveryProfile[],
  selectedTags: string[],
): DiscoveryProfile[] => {
  if (selectedTags.length === 0) {
    return profiles;
  }

  return profiles.filter((profile) =>
    selectedTags.every((tag) => profile.interests.includes(tag)),
  );
};
