import type { DiscoveryProfile } from './ProfileCard';

export const MAX_SELECTED_TAGS = 8;

export type DiscoveryTagCount = {
  tag: string;
  count: number;
};

export const byPopularity = (a: DiscoveryTagCount, b: DiscoveryTagCount) =>
  b.count - a.count || (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0);

export const withSelectedTags = (
  tags: DiscoveryTagCount[],
  selected: string[],
  missing: DiscoveryTagCount[],
  size: number,
): DiscoveryTagCount[] => {
  let drop = Math.max(0, missing.length - (size - tags.length));
  const kept = [...tags]
    .reverse()
    .filter(({ tag }) => {
      if (drop > 0 && !selected.includes(tag)) {
        drop--;
        return false;
      }
      return true;
    })
    .reverse();

  return [...kept, ...missing].sort(byPopularity);
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
