import type { DiscoveryData } from './discoveryData';
import type { DiscoveryViewer } from './discoveryViewer';

const entries = new Map<string, DiscoveryData>();
const generations = new Map<string, number>();
let viewer: DiscoveryViewer | null = null;

export const discoveryCache = {
  get: (url: string) => entries.get(url),
  viewer: () => viewer,
  begin: (url: string) => {
    const generation = (generations.get(url) ?? 0) + 1;
    generations.set(url, generation);
    return generation;
  },
  set: (url: string, data: DiscoveryData, generation: number) => {
    if (generations.get(url) === generation) entries.set(url, data);
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
  invalidate: () => {
    entries.clear();
    for (const [url, generation] of generations)
      generations.set(url, generation + 1);
  },
  clear: () => {
    entries.clear();
    viewer = null;
  },
};
