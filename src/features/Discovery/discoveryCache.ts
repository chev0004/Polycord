import type { DiscoveryData } from './discoveryData';
import type { DiscoveryViewer } from './discoveryViewer';

const entries = new Map<string, DiscoveryData>();
let viewer: DiscoveryViewer | null = null;

export const discoveryCache = {
  get: (url: string) => entries.get(url),
  viewer: () => viewer,
  set: (url: string, data: DiscoveryData) => {
    entries.set(url, data);
  },
  setViewer: (next: DiscoveryViewer) => {
    if (viewer && viewer.viewerUserId !== next.viewerUserId) entries.clear();
    viewer = next;
  },
  setSaved: (profileId: string, saved: boolean) => {
    for (const [url, data] of entries)
      entries.set(url, {
        ...data,
        savedProfileIds: saved
          ? [...new Set([...data.savedProfileIds, profileId])]
          : data.savedProfileIds.filter((id) => id !== profileId),
      });
  },
  removeProfile: (profileId: string) => {
    for (const [url, data] of entries)
      entries.set(url, {
        ...data,
        profiles: data.profiles.filter((profile) => profile.id !== profileId),
      });
  },
  clear: () => {
    entries.clear();
    viewer = null;
  },
};
