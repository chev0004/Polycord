'use client';

import { useSyncExternalStore } from 'react';

export type LoadPhase =
  | 'document'
  | 'controls'
  | 'viewer'
  | 'discovery'
  | 'grid';
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
  transport: 'direct' | 'https';
  phases: Record<LoadPhase, PhaseTiming>;
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

let trace: DiscoveryLoadTrace | null = null;
const listeners = new Set<() => void>();
const requests = { viewer: 0, discovery: 0 };

const emit = () => {
  for (const listener of listeners) listener();
};

export const startLoadTrace = () => {
  if (trace || typeof document === 'undefined') return trace;
  const bootstrap = document.getElementById('polycord-load-trace');
  if (!bootstrap) return null;
  const data = JSON.parse(bootstrap.textContent ?? '{}');
  const navigation = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined;
  trace = {
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
        spans: data.spans,
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

export const refreshNavigationTiming = () => {
  if (
    !trace ||
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
  void document.fonts.ready.then(() =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        setLoadPhase('controls', {
          status: 'done',
          start: 0,
          end: performance.now(),
        }),
      ),
    ),
  );
};

export const beginGridLoad = () => {
  const current = startLoadTrace();
  if (current && current.phases.grid.status === 'pending')
    setLoadPhase('grid', { status: 'loading', start: performance.now() });
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
  void document.fonts.ready.then(() =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (
          !trace ||
          trace.finished !== undefined ||
          trace.phases.viewer.status !== 'done' ||
          trace.phases.discovery.status !== 'done'
        )
          return;
        refreshNavigationTiming();
        const finished = performance.now();
        trace = {
          ...trace,
          finished,
          phases: {
            ...trace.phases,
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
  phase: 'viewer' | 'discovery',
  url: string,
  signal: AbortSignal,
) => {
  const sequence = ++requests[phase];
  const start = performance.now();
  const record = (timing: PhaseTiming) => {
    const current = startLoadTrace();
    if (!current || current.finished !== undefined) return;
    const attempt = { phase, sequence, ...timing };
    const previous = current.attempts ?? [];
    const exists = previous.some(
      (item) => item.phase === phase && item.sequence === sequence,
    );
    trace = {
      ...current,
      attempts: exists
        ? previous.map((item) =>
            item.phase === phase && item.sequence === sequence ? attempt : item,
          )
        : [...previous, attempt],
      phases:
        sequence === requests[phase]
          ? { ...current.phases, [phase]: timing }
          : current.phases,
    };
    emit();
  };
  record({ status: 'loading', start });
  const spans: Record<string, number> = {};
  let httpStatus: number | undefined;
  try {
    const response = await fetch(url, { cache: 'no-store', signal });
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
      end: performance.now(),
      spans,
      httpStatus,
    });
    return data;
  } catch (error) {
    record({
      status: signal.aborted ? 'cancelled' : 'failed',
      start,
      end: performance.now(),
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
