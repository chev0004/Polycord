'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type RouteProgressContextValue = {
  start: () => void;
};

const RouteProgressContext = createContext<RouteProgressContextValue | null>(
  null,
);

const COMPLETE_DELAY_MS = 260;
const FALLBACK_DELAY_MS = 8000;
const TRICKLE_DELAY_MS = 450;

const shouldStartProgress = (href: string) => {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    const target = new URL(href, window.location.href);
    const current = new URL(window.location.href);

    if (target.origin !== current.origin) {
      return false;
    }

    return (
      target.pathname !== current.pathname || target.search !== current.search
    );
  } catch {
    return true;
  }
};

export const RouteProgressProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const pendingRef = useRef(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trickleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousPathnameRef = useRef(pathname);

  const clearTimers = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (trickleTimerRef.current) {
      clearInterval(trickleTimerRef.current);
      trickleTimerRef.current = null;
    }
  }, []);

  const complete = useCallback(() => {
    if (!pendingRef.current) {
      return;
    }

    pendingRef.current = false;
    clearTimers();
    setProgress(100);

    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      setProgress(0);
    }, COMPLETE_DELAY_MS);
  }, [clearTimers]);

  const start = useCallback(() => {
    clearTimers();
    pendingRef.current = true;
    setIsVisible(true);
    setProgress((current) => (current > 0 ? Math.min(current, 72) : 14));

    trickleTimerRef.current = setInterval(() => {
      setProgress((current) => Math.min(current + (88 - current) * 0.18, 88));
    }, TRICKLE_DELAY_MS);

    fallbackTimerRef.current = setTimeout(complete, FALLBACK_DELAY_MS);
  }, [clearTimers, complete]);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) {
      return;
    }

    previousPathnameRef.current = pathname;
    complete();
  }, [pathname, complete]);

  useEffect(() => clearTimers, [clearTimers]);

  const value = useMemo(() => ({ start }), [start]);

  return (
    <RouteProgressContext.Provider value={value}>
      {children}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed top-0 left-0 z-[70] h-1 bg-primary shadow-[0_0_12px_rgba(193,213,233,0.65)] transition-[width,opacity] duration-200 ease-out ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ width: `${progress}%` }}
      />
    </RouteProgressContext.Provider>
  );
};

export const useRouteProgress = () => {
  const context = useContext(RouteProgressContext);

  if (!context) {
    throw new Error(
      'useRouteProgress must be used within RouteProgressProvider',
    );
  }

  return context;
};

export const useRouteProgressRouter = () => {
  const router = useRouter();
  const { start } = useRouteProgress();

  const push = useCallback(
    (href: string) => {
      if (
        !window.dispatchEvent(
          new Event('polycord:navigate', { cancelable: true }),
        )
      )
        return;
      if (shouldStartProgress(href)) {
        start();
      }

      router.push(href);
    },
    [router, start],
  );

  const replace = useCallback(
    (href: string) => {
      if (
        !window.dispatchEvent(
          new Event('polycord:navigate', { cancelable: true }),
        )
      )
        return;
      if (shouldStartProgress(href)) {
        start();
      }

      router.replace(href);
    },
    [router, start],
  );

  return useMemo(
    () => ({
      back: router.back,
      forward: router.forward,
      prefetch: router.prefetch,
      push,
      refresh: router.refresh,
      replace,
    }),
    [
      router.back,
      router.forward,
      router.prefetch,
      router.refresh,
      push,
      replace,
    ],
  );
};
