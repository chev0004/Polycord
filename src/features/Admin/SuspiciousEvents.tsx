'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { Spinner, useModFormat } from './ModerationParts';
import type { ActivityRange, ModSuspiciousEvent } from './types';
import type { ModerationStore } from './useModeration';

export const useEventLabel = () => {
  const t = useTranslations('Admin');
  return (action: string) =>
    ({
      report: t('event_report'),
      bump: t('event_bump'),
      copy: t('event_copy'),
      'auth-failure': t('event_authFailure'),
    })[action] ?? action;
};

export const SuspiciousEvents = ({
  id,
  store,
  userId,
  range,
}: {
  id: string;
  store: ModerationStore;
  userId: string;
  range: ActivityRange;
}) => {
  const t = useTranslations('Admin');
  const { absolute } = useModFormat();
  const eventLabel = useEventLabel();
  const [events, setEvents] = useState<ModSuspiciousEvent[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<'loading' | 'idle' | 'failed'>(
    'loading',
  );
  const { loadSuspiciousEvents } = store;

  const load = useCallback(
    (offset: number) => {
      setStatus('loading');
      loadSuspiciousEvents(userId, range, offset).then(
        (page) => {
          setEvents((current) => [
            ...current,
            ...page.events.filter(
              ({ id: eventId }) => !current.some(({ id }) => id === eventId),
            ),
          ]);
          setHasMore(page.hasMore);
          setStatus('idle');
        },
        () => setStatus('failed'),
      );
    },
    [userId, range, loadSuspiciousEvents],
  );

  useEffect(() => {
    load(0);
  }, [load]);

  return (
    <div id={id}>
      {events.length ? (
        <ul className="flex flex-col gap-2 px-5 py-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-[13px]"
            >
              <span className="min-w-0 flex-1">
                <span className="font-medium text-foreground">
                  {eventLabel(event.action)}
                </span>
                <span className="ml-2 text-muted text-xs">
                  {t('eventReason')}
                </span>
              </span>
              <span className="font-mono text-muted text-xs">
                {event.ip ?? '-'}
              </span>
              <time dateTime={event.createdAt} className="text-muted">
                {absolute(event.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      ) : null}
      {status === 'loading' ? (
        <output className="flex items-center gap-2 px-5 py-3 text-[13px] text-subtle">
          <Spinner />
          {t('eventsLoading')}
        </output>
      ) : null}
      {status === 'failed' ? (
        <p
          role="alert"
          className="flex items-center gap-2 px-5 py-3 text-[13px] text-red-400"
        >
          {t('eventsFailed')}
          <button
            type="button"
            onClick={() => load(events.length)}
            className="font-semibold text-primary-light"
          >
            {t('retry')}
          </button>
        </p>
      ) : null}
      {status === 'idle' && hasMore ? (
        <button
          type="button"
          onClick={() => load(events.length)}
          className="px-5 py-3 font-semibold text-[13px] text-primary-light"
        >
          {t('moreEvents')}
        </button>
      ) : null}
    </div>
  );
};
