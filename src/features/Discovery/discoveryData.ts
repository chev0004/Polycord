import type { DiscoveryTagCount } from './discoveryTags';
import type { DiscoveryProfile } from './ProfileCard';

export type DiscoveryData = {
  profiles: DiscoveryProfile[];
  total: number;
  boosts?: number;
  page: number;
  tags: DiscoveryTagCount[];
  savedProfileIds: string[];
};

export const DISCOVERY_PAGE_SIZE = 9;
export const BOOSTS_PER_PAGE = 3;

export const discoveryGroupSizes = (boosts: number, bumps: number) => {
  const sizes: number[] = [];
  for (let group = 0; ; group++) {
    const placed = Math.min(boosts, group * BOOSTS_PER_PAGE);
    const slots = Math.min(BOOSTS_PER_PAGE, boosts - placed);
    const bumpsLeft = bumps - (group * DISCOVERY_PAGE_SIZE - placed);
    const size =
      slots + Math.max(0, Math.min(DISCOVERY_PAGE_SIZE - slots, bumpsLeft));
    if (size <= 0) return sizes;
    sizes.push(size);
  }
};
