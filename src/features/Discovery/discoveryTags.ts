import type { DiscoveryProfile } from './ProfileCard';

export type DiscoveryTagCount = {
  tag: string;
  count: number;
};

export const buildTagCounts = (
  profiles: DiscoveryProfile[],
): DiscoveryTagCount[] => {
  const counts = new Map<string, number>();

  for (const profile of profiles) {
    for (const tag of profile.tags) {
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

export const applyTagFilter = (
  profiles: DiscoveryProfile[],
  selectedTags: string[],
): DiscoveryProfile[] => {
  if (selectedTags.length === 0) {
    return profiles;
  }

  return profiles.filter((profile) =>
    selectedTags.every((tag) => profile.tags.includes(tag)),
  );
};
