import { discoveryCache } from './discoveryCache';
import { buildDiscoveryQuery, parseDiscoveryState } from './discoveryUrlState';
import { DISCOVERY_SKELETON_ENABLED } from './skeletonSetting';

let destination: URL | null = null;
const pending = new Map<string, Promise<void>>();

export const recordDestination = (href: string | null) => {
  destination = href ? new URL(href, window.location.href) : null;
};

export const holdForDiscovery = (locale: string) => {
  if (
    DISCOVERY_SKELETON_ENABLED ||
    !destination ||
    destination.pathname.replace(/\/$/, '') !== `/${locale}`
  )
    return;
  const state = parseDiscoveryState(destination.searchParams);
  const stacked = window.matchMedia('(max-width: 767px)').matches;
  const requestUrl = `/api/discovery?${buildDiscoveryQuery(state)}&locale=${locale}${stacked && state.page > 1 ? '&stack=1' : ''}`;
  if (discoveryCache.viewer() && discoveryCache.get(requestUrl)) return;
  let hold = pending.get(requestUrl);
  if (!hold) {
    hold = fetch(
      requestUrl.replace('/api/discovery?', '/api/discovery/bootstrap?'),
      {
        cache: 'no-store',
      },
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!body) return;
        discoveryCache.setViewer(body.viewer);
        discoveryCache.set(
          requestUrl,
          body.data,
          discoveryCache.begin(requestUrl),
        );
      })
      .catch(() => {})
      .finally(() => {
        setTimeout(() => pending.delete(requestUrl), 0);
      });
    pending.set(requestUrl, hold);
  }
  return hold;
};
