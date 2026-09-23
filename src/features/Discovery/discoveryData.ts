import type { DiscoveryTagCount } from './discoveryTags';
import type { DiscoveryProfile } from './ProfileCard';

export type DiscoveryData = {
  profiles: DiscoveryProfile[];
  total: number;
  page: number;
  tags: DiscoveryTagCount[];
  savedProfileIds: string[];
};
