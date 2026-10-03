import type { DiscoveryTagCount } from './discoveryTags';
import type { DiscoveryProfile } from './ProfileCard';

export type DiscoveryData = {
  profiles: DiscoveryProfile[];
  total: number;
  cards?: number;
  page: number;
  tags: DiscoveryTagCount[];
  savedProfileIds: string[];
};
