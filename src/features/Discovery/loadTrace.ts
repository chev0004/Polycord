'use client';

import { useSyncExternalStore } from 'react';

export type LoadPhase =
  | 'document'
  | 'controls'
  | 'viewer'
  | 'discovery'
  | 'grid'
  | 'page';
export type PhaseStatus =
  | 'pending'
  | 'loading'
  | 'done'
  | 'failed'
  | 'cancelled';
export type PhaseTiming = {
  status: PhaseStatus;
  start?: number;
  end?: number;
  spans?: Record<string, number>;
  httpStatus?: number;
};
export type DiscoveryLoadTrace = {
  startedAt?: number;
  route?: string;
  kind?: 'document' | 'client';
  routes?: string[];
  resources?: {
    name: string;
    start: number;
    end: number;
    redirect: number;
    firstByte: number;
    spans: Record<string, number>;
  }[];
  history?: Omit<DiscoveryLoadTrace, 'history'>[];
  transport: 'direct' | 'https';
  phases: Record<Exclude<LoadPhase, 'page'>, PhaseTiming> & {
    page?: PhaseTiming;
  };
  navigation: {
    redirect: number;
    connection: number;
    firstByte: number;
    download: number;
    firstPaint?: number;
  };
  finished?: number;
  attempts?: (PhaseTiming & {
    phase: 'viewer' | 'discovery';
    sequence: number;
  })[];
};

type EarlyBootstrap = {
  url: string;
  start: number;
  response: Promise<Response | undefined>;
};

declare global {
  interface Window {
    __polycordBootstrap?: EarlyBootstrap;
  }
}

let trace: DiscoveryLoadTrace | null = null;
const listeners = new Set<() => void>();
const requests = { viewer: 0, discovery: 0 };
let generation = 0;
let destination = '';
let disabled = false;
let committedPath = '';
const time = () => performance.now() - (trace?.startedAt ?? 0);
const serverSpans = (metrics: readonly PerformanceServerTiming[]) =>
  Object.fromEntries(
    metrics
      .filter((metric) => metric.name.startsWith('pc_'))
      .map((metric) => [metric.name.slice(3), metric.duration]),
  );

export const traceRouteName = (href: string) => {
  const url = new URL(href, window.location.href);
  return url.pathname.replace(/\/(u|user)\/[^/]+/, '/$1/[member]');
};

const emit = () => {
  for (const listener of listeners) listener();
};

export const startLoadTrace = () => {
  if (disabled) return null;
  if (trace || typeof document === 'undefined') return trace;
  const bootstrap = document.getElementById('polycord-load-trace');
  if (!bootstrap) return null;
  const data = JSON.parse(bootstrap.textContent ?? '{}');
  committedPath = typeof window === 'undefined' ? '' : window.location.pathname;
  const navigation = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined;
  trace = {
    route:
      typeof window === 'undefined'
        ? undefined
        : traceRouteName(window.location.href),
    kind: 'document',
    transport: data.transport,
    navigation: {
      redirect: navigation
        ? navigation.redirectEnd - navigation.redirectStart
        : 0,
      connection: navigation
        ? navigation.connectEnd - navigation.domainLookupStart
        : 0,
      firstByte: navigation?.responseStart ?? 0,
      download: navigation?.responseEnd
        ? navigation.responseEnd - navigation.responseStart
        : 0,
      firstPaint: performance.getEntriesByName('first-contentful-paint')[0]
        ?.startTime,
    },
    phases: {
      document: {
        status: navigation?.responseEnd ? 'done' : 'loading',
        start: 0,
        end: navigation?.responseEnd || undefined,
        spans: {
          ...data.spans,
          ...serverSpans(navigation?.serverTiming ?? []),
        },
      },
      controls: { status: 'pending' },
      viewer: { status: 'pending' },
      discovery: { status: 'pending' },
      grid: { status: 'pending' },
    },
  };
  emit();
  return trace;
};

export const disableLoadTrace = () => {
  disabled = true;
  trace = null;
  generation++;
  emit();
};

export const beginPageNavigation = (href?: string, force = false) => {
  const current = startLoadTrace();
  if (!current) return;
  const target = href ? new URL(href, window.location.href) : null;
  if (
    target &&
    (target.origin !== window.location.origin ||
      target.pathname === window.location.pathname)
  )
    return;
  const next = target ? `${target.pathname}${target.search}` : '';
  if (
    !force &&
    current.kind === 'client' &&
    current.finished === undefined &&
    (destination === next || !href)
  )
    return;
  generation++;
  destination = next;
  const { history = [], ...previous } = current;
  trace = {
    transport: current.transport,
    kind: 'client',
    route: target ? traceRouteName(target.href) : undefined,
    routes: target ? [traceRouteName(target.href)] : [],
    startedAt: performance.now(),
    navigation: { redirect: 0, connection: 0, firstByte: 0, download: 0 },
    history: [
      ...history,
      {
        ...previous,
        finished: previous.finished ?? time(),
        attempts: previous.attempts?.map((attempt) =>
          attempt.status === 'loading'
            ? { ...attempt, status: 'cancelled' as const, end: time() }
            : attempt,
        ),
        phases: Object.fromEntries(
          Object.entries(previous.phases).map(([phase, timing]) => [
            phase,
            previous.finished === undefined &&
            (timing.status === 'loading' || timing.status === 'pending')
              ? { ...timing, status: 'cancelled', end: time() }
              : timing,
          ]),
        ) as DiscoveryLoadTrace['phases'],
      },
    ].slice(-15),
    phases: {
      document: { status: 'loading', start: 0 },
      controls: { status: 'pending' },
      viewer: { status: 'pending' },
      discovery: { status: 'pending' },
      grid: { status: 'pending' },
      page: { status: 'pending' },
    },
  };
  emit();
};

export const commitPageNavigation = (
  href: string,
  spans?: Record<string, number>,
) => {
  const current = startLoadTrace();
  if (!current) return;
  const route = traceRouteName(href);
  committedPath = new URL(href, window.location.href).pathname;
  if (current.finished !== undefined && current.route === route) return;
  if (current.finished !== undefined) beginPageNavigation(undefined, true);
  if (!trace) return;
  const routes = trace.routes ?? (trace.route ? [trace.route] : []);
  trace = {
    ...trace,
    route,
    routes: routes.at(-1) === route ? routes : [...routes, route],
    phases: {
      ...trace.phases,
      ...(trace.kind === 'client'
        ? { document: { status: 'done', start: 0, end: time() } as PhaseTiming }
        : {}),
      page: {
        status: 'loading',
        start: 0,
        spans: { ...trace.phases.page?.spans, ...spans },
      },
    },
  };
  emit();
};

export const beginHistoryNavigation = () => {
  if (window.location.pathname !== committedPath)
    beginPageNavigation(undefined, Boolean(destination));
};

export const cancelPageNavigation = () => {
  const previous = trace?.history?.at(-1);
  if (
    !trace ||
    trace.kind !== 'client' ||
    trace.finished !== undefined ||
    !previous
  )
    return;
  generation++;
  trace = { ...previous, history: trace.history?.slice(0, -1) };
  emit();
};

export const recordLoadResource = (entry: PerformanceResourceTiming) => {
  if (
    !trace ||
    trace.finished !== undefined ||
    entry.startTime < (trace.startedAt ?? 0)
  )
    return;
  if (
    !['fetch', 'xmlhttprequest', 'script', 'link'].includes(entry.initiatorType)
  )
    return;
  const url = new URL(entry.name, window.location.href);
  if (url.origin !== window.location.origin) return;
  const name = url.pathname.startsWith('/_next/static/')
    ? 'assets'
    : traceRouteName(url.href);
  const resource = {
    name,
    start: entry.startTime - (trace.startedAt ?? 0),
    end: entry.responseEnd - (trace.startedAt ?? 0),
    redirect: entry.redirectEnd - entry.redirectStart,
    firstByte: entry.responseStart ? entry.responseStart - entry.startTime : 0,
    spans: serverSpans(entry.serverTiming),
  };
  if (
    trace.resources?.some(
      (item) => item.name === name && item.start === resource.start,
    )
  )
    return;
  trace = { ...trace, resources: [...(trace.resources ?? []), resource] };
  emit();
};

export const finishPageLoad = (failed = false) => {
  const current = startLoadTrace();
  if (!current || current.finished !== undefined) return;
  const active = generation;
  void document.fonts.ready.then(() =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (!trace || active !== generation || trace.finished !== undefined)
          return;
        refreshNavigationTiming();
        for (const entry of performance.getEntriesByType('resource'))
          recordLoadResource(entry as PerformanceResourceTiming);
        const finished = time();
        trace = {
          ...trace,
          finished,
          phases: {
            ...trace.phases,
            controls: { status: 'done', start: 0, end: finished },
            page: {
              ...trace.phases.page,
              start: 0,
              status: failed ? 'failed' : 'done',
              end: finished,
            },
          },
        };
        emit();
      }),
    ),
  );
};

export const refreshNavigationTiming = () => {
  if (
    !trace ||
    trace.kind === 'client' ||
    trace.finished !== undefined ||
    (trace.phases.document.status === 'done' &&
      trace.navigation.firstPaint !== undefined)
  )
    return;
  const navigation = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined;
  const firstPaint = performance.getEntriesByName('first-contentful-paint')[0]
    ?.startTime;
  if (!navigation?.responseEnd && firstPaint === undefined) return;
  trace = {
    ...trace,
    navigation: {
      ...trace.navigation,
      firstPaint,
      download: navigation?.responseEnd
        ? navigation.responseEnd - navigation.responseStart
        : trace.navigation.download,
    },
    phases: {
      ...trace.phases,
      document: {
        ...trace.phases.document,
        spans: {
          ...trace.phases.document.spans,
          ...serverSpans(navigation?.serverTiming ?? []),
        },
        status: navigation?.responseEnd ? 'done' : trace.phases.document.status,
        end: navigation?.responseEnd || trace.phases.document.end,
      },
    },
  };
  emit();
};

export const setLoadPhase = (phase: LoadPhase, timing: PhaseTiming) => {
  const current = startLoadTrace();
  if (!current || current.finished !== undefined) return;
  trace = { ...current, phases: { ...current.phases, [phase]: timing } };
  emit();
};

export const markControlsReady = () => {
  const current = startLoadTrace();
  if (!current || current.phases.controls.status !== 'pending') return;
  setLoadPhase('controls', { status: 'loading', start: 0 });
  const active = generation;
  void document.fonts.ready.then(() =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (active !== generation) return;
        setLoadPhase('controls', {
          status: 'done',
          start: 0,
          end: time(),
        });
      }),
    ),
  );
};

export const beginGridLoad = () => {
  const current = startLoadTrace();
  if (current && current.phases.grid.status === 'pending')
    setLoadPhase('grid', { status: 'loading', start: time() });
};

export const finishLoadTrace = () => {
  const current = startLoadTrace();
  if (
    !current ||
    current.finished !== undefined ||
    current.phases.viewer.status !== 'done' ||
    current.phases.discovery.status !== 'done'
  )
    return;
  const active = generation;
  void document.fonts.ready.then(() =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (
          !trace ||
          active !== generation ||
          trace.finished !== undefined ||
          trace.phases.viewer.status !== 'done' ||
          trace.phases.discovery.status !== 'done'
        )
          return;
        refreshNavigationTiming();
        for (const entry of performance.getEntriesByType('resource'))
          recordLoadResource(entry as PerformanceResourceTiming);
        const finished = time();
        trace = {
          ...trace,
          finished,
          phases: {
            ...trace.phases,
            page: {
              ...trace.phases.page,
              status: 'done',
              start: 0,
              end: finished,
            },
            grid: {
              ...trace.phases.grid,
              status: 'done',
              start:
                trace.phases.grid.start ??
                Math.max(
                  trace.phases.viewer.end ?? finished,
                  trace.phases.discovery.end ?? finished,
                ),
              end: finished,
            },
          },
        };
        emit();
      }),
    ),
  );
};

export const traceDiscoveryRequest = async <T>(
  phase: 'viewer' | 'discovery' | 'bootstrap',
  url: string,
  signal: AbortSignal,
) => {
  const phases =
    phase === 'bootstrap' ? (['viewer', 'discovery'] as const) : [phase];
  const sequences = phases.map((item) => ++requests[item]);
  const active = generation;
  const early =
    window.__polycordBootstrap?.url === url ? window.__polycordBootstrap : null;
  window.__polycordBootstrap = undefined;
  const start = early?.start ?? time();
  const record = (timing: PhaseTiming) => {
    const current = startLoadTrace();
    if (!current || current.finished !== undefined || active !== generation)
      return;
    let next = current;
    phases.forEach((item, index) => {
      const sequence = sequences[index];
      const attempt = { phase: item, sequence, ...timing };
      const previous = next.attempts ?? [];
      const exists = previous.some(
        (entry) => entry.phase === item && entry.sequence === sequence,
      );
      next = {
        ...next,
        attempts: exists
          ? previous.map((entry) =>
              entry.phase === item && entry.sequence === sequence
                ? attempt
                : entry,
            )
          : [...previous, attempt],
        phases:
          sequence === requests[item]
            ? { ...next.phases, [item]: timing }
            : next.phases,
      };
    });
    trace = next;
    emit();
  };
  record({ status: 'loading', start });
  const spans: Record<string, number> = {};
  let httpStatus: number | undefined;
  try {
    const response =
      (early && (await early.response)) ||
      (await fetch(url, { cache: 'no-store', signal }));
    httpStatus = response.status;
    for (const header of ['Server-Timing', 'x-polycord-load-gate']) {
      for (const metric of response.headers.get(header)?.split(',') ?? []) {
        const match = /^\s*pc_([a-z-]+);dur=([\d.]+)\s*$/.exec(metric);
        if (match) spans[match[1]] = Number(match[2]);
      }
    }
    if (!response.ok) throw new Error('Discovery load failed');
    const data: T = await response.json();
    signal.throwIfAborted();
    record({
      status: 'done',
      start,
      end: time(),
      spans,
      httpStatus,
    });
    return data;
  } catch (error) {
    record({
      status: signal.aborted ? 'cancelled' : 'failed',
      start,
      end: time(),
      spans,
      httpStatus,
    });
    throw error;
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  startLoadTrace();
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => trace;
export const useDiscoveryLoadTrace = () =>
  useSyncExternalStore(subscribe, snapshot, () => null);
