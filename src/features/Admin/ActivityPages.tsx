'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { DatePicker } from '@/components/DatePicker';
import {
  type CachedPage,
  pageCache,
  reportViewCache,
  viewCache,
} from './adminCache';
import { ActionError, Spinner, useModFormat } from './ModerationParts';
import type {
  ActivityFilters,
  ActivityKind,
  ActivityPage,
  ActivityRange,
  ReportView,
} from './types';
import type { ModerationStore } from './useModeration';

const addDays = (day: Date, days: number) =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate() + days);

const today = () => addDays(new Date(), 0);

const toInputValue = (day: Date) =>
  `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

const FRESH_MS = 15000;
const CACHE_LIMIT = 120;

export const useActivityPages = <T,>(
  load: (
    range: ActivityRange,
    cursor?: string,
    filters?: ActivityFilters,
  ) => Promise<ActivityPage<T>>,
  active: boolean,
  revision: number,
  scope: string,
) => {
  const [day, setDay] = useState(() => viewCache.get(scope)?.day ?? today());
  const [filters, setFilters] = useState<ActivityFilters>(
    () => viewCache.get(scope)?.filters ?? {},
  );
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [page, setPage] = useState<ActivityPage<T> | null>(null);
  const [failed, setFailed] = useState(false);
  const cache = useRef(pageCache as Map<string, CachedPage<T>>);
  const seenRevision = useRef(revision);
  const range = useMemo(
    () => ({
      from: day.toISOString(),
      to: addDays(day, 1).toISOString(),
    }),
    [day],
  );
  const keyOf = useCallback(
    (cursor?: string) => JSON.stringify([scope, range, cursor, filters]),
    [scope, range, filters],
  );

  const start = useCallback(
    (cursor?: string) => {
      const key = keyOf(cursor);
      const entry: CachedPage<T> = {
        at: Date.now(),
        request: load(range, cursor, filters),
        page: cache.current.get(key)?.page,
      };
      entry.request.then(
        (result) => {
          entry.page = result;
        },
        () => {
          if (cache.current.get(key) === entry) cache.current.delete(key);
        },
      );
      cache.current.set(key, entry);
      if (cache.current.size > CACHE_LIMIT)
        cache.current.delete(cache.current.keys().next().value as string);
      return entry;
    },
    [keyOf, load, range, filters],
  );

  useEffect(() => {
    if (!active) return;
    let current = true;
    const refreshed = seenRevision.current !== revision;
    seenRevision.current = revision;
    if (refreshed) cache.current.clear();
    const cursor = cursors.at(-1);
    const hit = cache.current.get(keyOf(cursor));
    if (!refreshed) setPage(hit?.page ?? null);
    setFailed(false);
    const entry = hit && Date.now() - hit.at < FRESH_MS ? hit : start(cursor);
    entry.request.then(
      (result) => current && setPage(result),
      () => current && setFailed(true),
    );
    return () => {
      current = false;
    };
  }, [active, cursors, keyOf, start, revision]);

  const chooseDay = (next: Date) => {
    viewCache.set(scope, { day: next, filters });
    setDay(next);
    setCursors([undefined]);
  };

  const chooseFilters = (next: ActivityFilters) => {
    viewCache.set(scope, { day, filters: next });
    setFilters(next);
    setCursors([undefined]);
  };

  return {
    range,
    day,
    filters,
    filtered: Object.values(filters).some(Boolean),
    isToday: toInputValue(day) === toInputValue(today()),
    rows: page?.rows,
    pageNumber: cursors.length,
    hasNext: Boolean(page?.nextCursor),
    loading: !page && !failed,
    failed,
    chooseDay,
    shiftDay: (days: number) => chooseDay(addDays(day, days)),
    goToday: () => chooseDay(today()),
    setFilter: (key: string, value: string) =>
      chooseFilters({ ...filters, [key]: value }),
    clearFilters: () => chooseFilters({}),
    resetPages: () => setCursors([undefined]),
    prefetch: () => {
      if (!cache.current.has(keyOf())) start();
    },
    retry: () => setCursors([...cursors]),
    nextPage: () =>
      page?.nextCursor && setCursors([...cursors, page.nextCursor]),
    previousPage: () => setCursors(cursors.slice(0, -1)),
  };
};

export const useTabPrefetch = (ready: boolean, prefetches: (() => void)[]) => {
  const pending = useRef(prefetches);
  pending.current = prefetches;
  const done = useRef(false);

  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    const timer = setTimeout(() => {
      for (const prefetch of pending.current) prefetch();
    });
    return () => clearTimeout(timer);
  }, [ready]);
};

export const useReportPages = (store: ModerationStore, active: boolean) => {
  const [view, setView] = useState<ReportView>(reportViewCache.view);
  const { loadReports } = store;
  const load = useCallback(
    (range: ActivityRange, cursor?: string, filters: ActivityFilters = {}) =>
      loadReports(range, cursor, { ...filters, status: view }),
    [loadReports, view],
  );
  const pages = useActivityPages(
    load,
    active,
    store.revision,
    `reports:${view}`,
  );

  return {
    view,
    pages,
    setView: (next: ReportView) => {
      reportViewCache.view = next;
      setView(next);
      pages.resetPages();
    },
  };
};

export type ActivityPages<T = unknown> = ReturnType<typeof useActivityPages<T>>;

const stepButton =
  'flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-background-main hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent';

export const ActivityDayBar = ({
  pages,
  kind,
  loadDays,
}: {
  pages: ActivityPages;
  kind: ActivityKind;
  loadDays: (
    kind: ActivityKind,
    month: Date,
  ) => Promise<Record<string, number>>;
}) => {
  const t = useTranslations('Admin');
  const { date } = useModFormat();
  const load = useCallback(
    (month: Date) => loadDays(kind, month),
    [loadDays, kind],
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => pages.shiftDay(-1)}
        aria-label={t('previousDay')}
        className={stepButton}
      >
        <MdChevronLeft size={20} />
      </button>
      <DatePicker
        value={pages.day}
        onChange={pages.chooseDay}
        today={today()}
        label={t('selectDate')}
        activity={{
          load,
          tone: kind === 'suspicious' ? 'danger' : 'primary',
          unit: (count) => t(`calendarUnit_${kind}`, { count }),
          monthLabel: t(`calendarMonth_${kind}`),
          legend: (count) => t('calendarLegend', { count }),
        }}
      />
      <button
        type="button"
        onClick={() => pages.shiftDay(1)}
        disabled={pages.isToday}
        aria-label={t('nextDay')}
        className={stepButton}
      >
        <MdChevronRight size={20} />
      </button>
      <button
        type="button"
        onClick={pages.goToday}
        disabled={pages.isToday}
        className="h-8 rounded-full px-3 font-semibold text-primary-light text-sm hover:bg-background-main disabled:opacity-40 disabled:hover:bg-transparent"
      >
        {t('today')}
      </button>
      <span
        aria-live="polite"
        className="font-semibold text-foreground text-sm"
      >
        {pages.isToday ? `${t('today')} · ` : ''}
        {date(pages.day)}
      </span>
    </div>
  );
};

export const ActivityPager = ({ pages }: { pages: ActivityPages }) => {
  const t = useTranslations('Admin');

  return (
    <nav
      aria-label={t('pagination')}
      className="flex items-center justify-between gap-2 border-line border-t px-3.5 py-2.5"
    >
      <button
        type="button"
        onClick={pages.previousPage}
        disabled={pages.pageNumber === 1}
        className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-muted text-sm hover:bg-background-main hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <MdChevronLeft size={18} />
        {t('previousPage')}
      </button>
      <span aria-current="page" className="text-[12.5px] text-subtle">
        {t('pageNumber', { page: pages.pageNumber })}
      </span>
      <button
        type="button"
        onClick={pages.nextPage}
        disabled={!pages.hasNext}
        className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-muted text-sm hover:bg-background-main hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
      >
        {t('nextPage')}
        <MdChevronRight size={18} />
      </button>
    </nav>
  );
};

export const ActivityStatus = ({ pages }: { pages: ActivityPages }) => {
  const t = useTranslations('Admin');

  if (pages.failed) {
    return (
      <div className="p-3.5">
        <ActionError onRetry={pages.retry} />
      </div>
    );
  }

  return (
    <output className="flex items-center justify-center gap-2 px-6 py-10 text-[13px] text-subtle">
      <Spinner />
      {t('loadingActivity')}
    </output>
  );
};
