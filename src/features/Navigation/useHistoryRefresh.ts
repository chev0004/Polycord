'use client';

import { useEffect } from 'react';

let historyHref: string | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    historyHref = window.location.href;
  });
}

export const useHistoryRefresh = (refresh: () => void) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (historyHref === window.location.href) refresh();
      historyHref = null;
    });
    const refreshRestored = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    window.addEventListener('pageshow', refreshRestored);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pageshow', refreshRestored);
    };
  }, [refresh]);
};
