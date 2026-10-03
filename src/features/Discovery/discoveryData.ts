import type { DiscoveryTagCount } from './discoveryTags';
import type { DiscoveryProfile } from './ProfileCard';

export type DiscoveryData = {
  profiles: DiscoveryProfile[];
  total: number;
  groupSizes?: number[];
  page: number;
  tags: DiscoveryTagCount[];
  savedProfileIds: string[];
};

export const DISCOVERY_PAGE_SIZE = 9;
export const BOOSTS_PER_PAGE = 3;

export type DiscoveryGroup = {
  boosts: number;
  bumpStart: number;
  bumpEnd: number;
  size: number;
};

export const planDiscoveryGroups = (
  boostPositions: number[],
  bumps: number,
) => {
  const groups: DiscoveryGroup[] = [];
  let bumpStart = 0;
  for (let group = 0; ; group++) {
    const first = group * BOOSTS_PER_PAGE;
    const boosts = Math.max(
      0,
      Math.min(BOOSTS_PER_PAGE, boostPositions.length - first),
    );
    const repeats = boostPositions
      .slice(first, first + boosts)
      .sort((a, b) => a - b);
    let bumpEnd = bumpStart + DISCOVERY_PAGE_SIZE - boosts;
    for (const position of repeats)
      if (position >= bumpStart && position < bumpEnd) bumpEnd++;
    bumpEnd = Math.min(bumpEnd, bumps);
    const skipped = repeats.filter(
      (position) => position >= bumpStart && position < bumpEnd,
    ).length;
    const size = boosts + bumpEnd - bumpStart - skipped;
    if (size <= 0) return groups;
    groups.push({ boosts, bumpStart, bumpEnd, size });
    bumpStart = bumpEnd;
  }
};

export const discoveryGroupSizes = (boostPositions: number[], bumps: number) =>
  planDiscoveryGroups(boostPositions, bumps).map((group) => group.size);
