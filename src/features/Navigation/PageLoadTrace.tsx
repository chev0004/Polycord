'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { DiscoveryLoadPanel } from '@/features/Discovery/DiscoveryLoadPanel';
import {
  beginHistoryNavigation,
  beginPageNavigation,
  commitPageNavigation,
  finishPageLoad,
  recordLoadResource,
  traceRouteName,
  useDiscoveryLoadTrace,
} from '@/features/Discovery/loadTrace';

export const PageLoadTrace = () => {
  const trace = useDiscoveryLoadTrace();
  const enabled = trace !== null;
  useEffect(() => {
    if (!enabled) return;
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = (event.target as Element).closest('a[href]');
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.download ||
        (link.target && link.target !== '_self')
      )
        return;
      beginPageNavigation(link.href);
    };
    const back = () => beginHistoryNavigation();
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      beginPageNavigation(undefined, true);
      commitPageNavigation(window.location.href);
      finishPageLoad();
    };
    document.addEventListener('click', click, true);
    window.addEventListener('popstate', back);
    window.addEventListener('pageshow', restore);
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        recordLoadResource(entry as PerformanceResourceTiming);
    });
    observer.observe({ type: 'resource', buffered: true });
    return () => {
      document.removeEventListener('click', click, true);
      window.removeEventListener('popstate', back);
      window.removeEventListener('pageshow', restore);
      observer.disconnect();
    };
  }, [enabled]);
  return <DiscoveryLoadPanel />;
};

export const PageLoadReady = ({
  route,
  spans,
  deferred = false,
}: {
  route: string;
  spans: Record<string, number>;
  deferred?: boolean;
}) => {
  const pathname = usePathname();
  useEffect(() => {
    if (traceRouteName(pathname) !== route) return;
    commitPageNavigation(pathname, spans);
    if (!deferred) finishPageLoad();
  }, [pathname, route, spans, deferred]);
  return null;
};

export const PageLoadFailure = () => {
  useEffect(() => {
    commitPageNavigation(window.location.href);
    finishPageLoad(true);
  }, []);
  return null;
};
