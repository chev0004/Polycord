'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  type DiscoveryLoadTrace,
  type LoadPhase,
  refreshNavigationTiming,
  useDiscoveryLoadTrace,
} from './loadTrace';

const discoveryPhases: LoadPhase[] = [
  'document',
  'controls',
  'viewer',
  'discovery',
  'grid',
];
const spanNames: Record<string, string> = {
  gate: 'gate',
  ban: 'ban',
  'ban-connect': 'banConnect',
  'ban-query': 'banQuery',
  'ban-close': 'banClose',
  handler: 'handler',
  account: 'account',
  profile: 'profile',
  settings: 'settings',
  staff: 'staff',
  'staff-count': 'staffCount',
  query: 'query',
  moderation: 'moderation',
  page: 'serverPage',
  'layout-account': 'account',
  'layout-settings': 'settings',
  'layout-theme': 'theme',
  'layout-staff': 'staff',
};

export const DiscoveryLoadPanelView = ({
  trace,
  now,
}: {
  trace: DiscoveryLoadTrace;
  now: number;
}) => {
  const t = useTranslations('LoadTrace');
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const discovery =
    (!trace.route || /^\/(en|ja)\/?$/.test(trace.route)) &&
    !(
      trace.phases.page?.status === 'done' &&
      trace.phases.viewer.status === 'pending'
    );
  const phases: LoadPhase[] = discovery
    ? discoveryPhases
    : ['document', 'controls', 'page'];
  const elapsed =
    trace.finished ??
    Math.max(
      now - (trace.startedAt ?? 0),
      trace.phases.controls.end ?? 0,
      trace.phases.document.end ?? 0,
    );
  const seconds = (ms: number) =>
    t('seconds', { seconds: (ms / 1000).toFixed(2) });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify({ ...trace, totalMs: elapsed }, null, 2),
      );
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  };
  return (
    <aside
      aria-label={t('title')}
      className="fixed right-3 bottom-3 z-[70] max-h-[50vh] w-[calc(100vw-24px)] max-w-md overflow-auto rounded-xl border border-background-lighter bg-background-darker p-4 font-figtree text-foreground text-sm shadow-xl"
    >
      <details open>
        <summary className="cursor-pointer font-semibold">
          {t('title')}{' '}
          <span className="ml-2 font-mono text-primary">
            {seconds(elapsed)}
          </span>
        </summary>
        <p className="mt-2 text-muted text-xs">
          {t(trace.finished === undefined ? 'running' : 'complete')} ·{' '}
          {t(trace.transport)}
        </p>
        {trace.route && (
          <p className="mt-1 font-mono text-muted text-xs">{trace.route}</p>
        )}
        <dl className="mt-3 space-y-3">
          {phases.map((phase) => {
            const timing = trace.phases[phase];
            if (!timing) return null;
            const duration =
              timing.start === undefined
                ? null
                : (timing.end ?? elapsed) - timing.start;
            return (
              <div key={phase}>
                <div className="flex items-start justify-between gap-3">
                  <dt>
                    {t(
                      phase === 'document' && trace.kind === 'client'
                        ? 'routing'
                        : phase,
                    )}{' '}
                    <span
                      className={
                        timing.status === 'failed'
                          ? 'text-danger'
                          : 'text-muted'
                      }
                    >
                      ({t(timing.status)}
                      {timing.httpStatus ? ` ${timing.httpStatus}` : ''})
                    </span>
                  </dt>
                  <dd className="shrink-0 font-mono">
                    {duration === null ? t('notStarted') : seconds(duration)}
                  </dd>
                </div>
                {phase === 'document' && trace.kind !== 'client' && (
                  <div className="mt-1 pl-3 text-muted text-xs">
                    {(
                      [
                        'redirect',
                        'connection',
                        'firstByte',
                        'download',
                        'firstPaint',
                      ] as const
                    ).map((name) => (
                      <div key={name} className="flex justify-between gap-3">
                        <span>{t(name)}</span>
                        <span className="font-mono">
                          {trace.navigation[name] === undefined
                            ? t('notReported')
                            : seconds(trace.navigation[name])}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {timing.spans && (
                  <div className="mt-1 pl-3 text-muted text-xs">
                    {Object.entries(timing.spans)
                      .filter(([name]) => spanNames[name])
                      .map(([name, duration]) => (
                        <div key={name} className="flex justify-between gap-3">
                          <span>{t(spanNames[name])}</span>
                          <span className="font-mono">{seconds(duration)}</span>
                        </div>
                      ))}
                    {(phase === 'viewer' || phase === 'discovery') &&
                      timing.spans.handler !== undefined &&
                      duration !== null && (
                        <div className="flex justify-between gap-3">
                          <span>{t('unattributed')}</span>
                          <span className="font-mono">
                            {seconds(
                              Math.max(
                                0,
                                duration -
                                  timing.spans.handler -
                                  (timing.spans.gate ?? 0),
                              ),
                            )}
                          </span>
                        </div>
                      )}
                  </div>
                )}
              </div>
            );
          })}
        </dl>
        {trace.routes && trace.routes.length > 1 && (
          <p className="mt-3 font-mono text-muted text-xs">
            {trace.routes.join(' → ')}
          </p>
        )}
        {trace.resources && trace.resources.length > 0 && (
          <details className="mt-3 text-muted text-xs">
            <summary className="cursor-pointer">
              {t('resources', { count: trace.resources.length })}
            </summary>
            <dl className="mt-2 space-y-2">
              {trace.resources.map((resource) => (
                <div key={`${resource.name}-${resource.start}`}>
                  <div className="flex justify-between gap-3">
                    <dt className="break-all font-mono">{resource.name}</dt>
                    <dd className="shrink-0 font-mono">
                      {seconds(resource.end - resource.start)}
                    </dd>
                  </div>
                  {resource.redirect > 0 && (
                    <div className="flex justify-between gap-3">
                      <dt>{t('redirect')}</dt>
                      <dd>{seconds(resource.redirect)}</dd>
                    </div>
                  )}
                  {Object.entries(resource.spans)
                    .filter(([name]) => spanNames[name])
                    .map(([name, duration]) => (
                      <div
                        key={name}
                        className="flex justify-between gap-3 pl-3"
                      >
                        <dt>{t(spanNames[name])}</dt>
                        <dd>{seconds(duration)}</dd>
                      </div>
                    ))}
                </div>
              ))}
            </dl>
          </details>
        )}
        {trace.history && trace.history.length > 0 && (
          <details className="mt-3 text-muted text-xs">
            <summary className="cursor-pointer">
              {t('history', { count: trace.history.length })}
            </summary>
            <ol className="mt-2 space-y-1">
              {trace.history.map((visit, index) => (
                <li
                  key={`${visit.startedAt ?? 0}-${index}`}
                  className="flex justify-between gap-3"
                >
                  <span className="break-all font-mono">
                    {visit.route ?? t('document')}{' '}
                    {Object.values(visit.phases).some(
                      (phase) => phase.status === 'cancelled',
                    )
                      ? `(${t('cancelled')})`
                      : ''}
                  </span>
                  <span className="shrink-0 font-mono">
                    {seconds(visit.finished ?? 0)}
                  </span>
                </li>
              ))}
            </ol>
          </details>
        )}
        {trace.attempts && trace.attempts.length > 0 && (
          <details className="mt-3 text-muted text-xs">
            <summary className="cursor-pointer">
              {t('attempts', { count: trace.attempts.length })}
            </summary>
            <ol className="mt-2 space-y-1">
              {trace.attempts.map((attempt) => (
                <li
                  key={`${attempt.phase}-${attempt.sequence}`}
                  className="flex justify-between gap-3"
                >
                  <span>
                    {t(attempt.phase)} #{attempt.sequence} ({t(attempt.status)}
                    {attempt.httpStatus ? ` ${attempt.httpStatus}` : ''})
                  </span>
                  <span className="shrink-0 font-mono">
                    {seconds((attempt.end ?? elapsed) - (attempt.start ?? 0))}
                  </span>
                </li>
              ))}
            </ol>
          </details>
        )}
        <p className="mt-3 text-muted text-xs">{t('limits')}</p>
        <button
          type="button"
          onClick={copy}
          className="mt-3 font-semibold text-primary underline-offset-2 hover:underline"
        >
          {t(copyFailed ? 'copyFailed' : copied ? 'copied' : 'copy')}
        </button>
      </details>
    </aside>
  );
};

export const DiscoveryLoadPanel = () => {
  const trace = useDiscoveryLoadTrace();
  const [now, setNow] = useState(0);
  const running = trace !== null && trace.finished === undefined;
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      refreshNavigationTiming();
      setNow(performance.now());
    };
    tick();
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [running]);
  return trace ? (
    <DiscoveryLoadPanelView
      key={trace.startedAt ?? 0}
      trace={trace}
      now={now}
    />
  ) : null;
};
