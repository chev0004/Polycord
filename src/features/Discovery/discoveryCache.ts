import type { DiscoveryData } from './discoveryData';
import type { DiscoveryViewer } from './discoveryViewer';

const entries = new Map<string, DiscoveryData>();
const generations = new Map<string, number>();
const pending = new Map<string, Promise<DiscoveryData>>();
const prefetchedAt = new Map<string, number>();
const PREFETCH_FRESH_MS = 60_000;
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
    if (generations.get(url) !== generation) return;
    entries.set(url, data);
    prefetchedAt.delete(url);
  },
  pending: (url: string) => pending.get(url),
  prefetched: (url: string) =>
    Date.now() - (prefetchedAt.get(url) ?? Number.NEGATIVE_INFINITY) <
    PREFETCH_FRESH_MS,
  prefetch: (url: string) => {
    if (entries.has(url) || pending.has(url)) return;
    const generation = discoveryCache.begin(url);
    const request = fetch(url, { cache: 'no-store' }).then((response) => {
      if (!response.ok) throw new Error('Discovery prefetch failed');
      return response.json() as Promise<DiscoveryData>;
    });
    pending.set(url, request);
    request
      .then((data) => {
        if (generations.get(url) !== generation) return;
        entries.set(url, data);
        prefetchedAt.set(url, Date.now());
        for (const { avatarUrl } of data.profiles)
          if (avatarUrl) new Image().src = avatarUrl;
      })
      .catch(() => {})
      .finally(() => {
        if (pending.get(url) === request) pending.delete(url);
      });
  },
  setViewer: (next: DiscoveryViewer) => {
    if (viewer && viewer.viewerUserId !== next.viewerUserId) {
      entries.clear();
      prefetchedAt.clear();
    }
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
    pending.clear();
    prefetchedAt.clear();
    for (const [url, generation] of generations)
      generations.set(url, generation + 1);
  },
  clear: () => {
    entries.clear();
    pending.clear();
    prefetchedAt.clear();
    viewer = null;
  },
};
