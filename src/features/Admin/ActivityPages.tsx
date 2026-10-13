'use client';

import { useTranslations } from 'next-intl';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { DatePicker, dayKey } from '@/components/DatePicker';
import {
  type CachedPage,
  loadDayCounts,
  pageCache,
  peekDayCounts,
  prefetchDayCounts,
  reportViewCache,
  viewCache,
} from './adminCache';
import { ActionError, Spinner, useModFormat } from './ModerationParts';
import type {
  ActivityFilters,
  ActivityKind,
  ActivityPage,
  ActivityRange,
  FirstPage,
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

const rangeOf = (day: Date) => ({
  from: day.toISOString(),
  to: addDays(day, 1).toISOString(),
});

const knownEmpty = (kind: ActivityKind | undefined, day: Date) => {
  if (!kind || toInputValue(day) === toInputValue(today())) return false;
  const counts = peekDayCounts(
    kind,
    new Date(day.getFullYear(), day.getMonth(), 1),
  );
  return counts !== undefined && !counts[dayKey(day)];
};

export const FirstPageContext = createContext<FirstPage | null>(null);

const track = <T,>(key: string, request: Promise<ActivityPage<T>>) => {
  const cache = pageCache as Map<string, CachedPage<T>>;
  const entry: CachedPage<T> = {
    at: Date.now(),
    request,
    page: cache.get(key)?.page,
  };
  request.then(
    (result) => {
      entry.page = result;
    },
    () => {
      if (cache.get(key) === entry) cache.delete(key);
    },
  );
  cache.set(key, entry);
  if (cache.size > CACHE_LIMIT)
    cache.delete(cache.keys().next().value as string);
  return entry;
};

const keyOfPage = (
  scope: string,
  range: ActivityRange,
  cursor: string | undefined,
  filters: ActivityFilters,
) => JSON.stringify([scope, range, cursor, filters]);

export const fade = ({ stale }: { stale: boolean }) =>
  `transition-opacity duration-150 ${stale ? 'opacity-50' : ''}`;

export const useActivityPages = <T,>(
  load: (
    range: ActivityRange,
    cursor?: string,
    filters?: ActivityFilters,
  ) => Promise<ActivityPage<T>>,
  active: boolean,
  revision: number,
  scope: string,
  kind?: ActivityKind,
) => {
  const first = useContext(FirstPageContext);
  const seed = first?.scope === scope && !viewCache.has(scope) ? first : null;
  const [day, setDay] = useState(
    () =>
      viewCache.get(scope)?.day ?? (seed ? new Date(seed.range.from) : today()),
  );
  const [filters, setFilters] = useState<ActivityFilters>(
    () => viewCache.get(scope)?.filters ?? {},
  );
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [loaded, setLoaded] = useState<{
    key: string;
    page: ActivityPage<T>;
  } | null>(() => {
    if (!seed) return null;
    const seededKey = keyOfPage(scope, seed.range, undefined, {});
    if (typeof window !== 'undefined' && !pageCache.has(seededKey))
      track(seededKey, Promise.resolve(seed.page));
    return { key: seededKey, page: seed.page as unknown as ActivityPage<T> };
  });
  const [failed, setFailed] = useState(false);
  const cache = useRef(pageCache as Map<string, CachedPage<T>>);
  const seenRevision = useRef(revision);
  const range = useMemo(
    () =>
      first?.range.from === day.toISOString() ? first.range : rangeOf(day),
    [day, first],
  );
  const keyFor = useCallback(
    (target: ActivityRange, cursor?: string) =>
      keyOfPage(scope, target, cursor, filters),
    [scope, filters],
  );
  const key = keyFor(range, cursors.at(-1));
  const page = loaded?.page ?? null;
  const stale = loaded !== null && loaded.key !== key;

  const start = useCallback(
    (target: ActivityRange, cursor?: string) =>
      track(keyFor(target, cursor), load(target, cursor, filters)),
    [keyFor, load, filters],
  );

  const prefetchDay = useCallback(
    (target: Date) => {
      const targetRange = rangeOf(target);
      if (cache.current.has(keyFor(targetRange))) return;
      if (knownEmpty(kind, target)) {
        const empty = { rows: [] };
        cache.current.set(keyFor(targetRange), {
          at: Date.now(),
          request: Promise.resolve(empty),
          page: empty,
        });
        return;
      }
      start(targetRange).request.catch(() => {});
    },
    [keyFor, kind, start],
  );

  useEffect(() => {
    if (!active) return;
    let current = true;
    const refreshed = seenRevision.current !== revision;
    seenRevision.current = revision;
    if (refreshed) cache.current.clear();
    const cursor = cursors.at(-1);
    if (!cursor) prefetchDay(day);
    const hit = cache.current.get(keyFor(range, cursor));
    if (!refreshed && hit?.page) setLoaded({ key, page: hit.page });
    setFailed(false);
    const entry =
      hit && Date.now() - hit.at < FRESH_MS ? hit : start(range, cursor);
    entry.request.then(
      (result) => {
        if (!current) return;
        setLoaded({ key, page: result });
        if (cursor) return;
        prefetchDay(addDays(day, -1));
        if (toInputValue(day) !== toInputValue(today()))
          prefetchDay(addDays(day, 1));
      },
      () => current && setFailed(true),
    );
    return () => {
      current = false;
    };
  }, [active, cursors, day, key, keyFor, prefetchDay, range, start, revision]);

  useEffect(() => {
    viewCache.set(scope, { day, filters });
  }, [scope, day, filters]);

  const chooseDay = (next: Date) => {
    setDay(next);
    setCursors([undefined]);
  };

  const chooseFilters = (next: ActivityFilters) => {
    setFilters(next);
    setCursors([undefined]);
  };

  return {
    range,
    day,
    filters,
    filtered: Object.values(filters).some(Boolean),
    isToday: toInputValue(day) === toInputValue(today()),
    rows: stale && failed ? undefined : page?.rows,
    stale,
    pageNumber: cursors.length,
    hasNext: !stale && Boolean(page?.nextCursor),
    loading: !page && !failed,
    failed,
    chooseDay,
    shiftDay: (days: number) => chooseDay(addDays(day, days)),
    goToday: () => chooseDay(today()),
    setFilter: (filterKey: string, value: string) =>
      chooseFilters({ ...filters, [filterKey]: value }),
    clearFilters: () => chooseFilters({}),
    resetPages: () => setCursors([undefined]),
    prefetch: () => prefetchDay(day),
    prefetchDay,
    retry: () => setCursors([...cursors]),
    nextPage: () =>
      !stale && page?.nextCursor && setCursors([...cursors, page.nextCursor]),
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
    'reports',
  );

  const prefetchOtherView = () => {
    const other = view === 'pending' ? 'resolved' : 'pending';
    const otherScope = `reports:${other}`;
    const saved = viewCache.get(otherScope);
    const otherRange = rangeOf(saved?.day ?? today());
    const otherFilters = saved?.filters ?? {};
    const otherKey = keyOfPage(otherScope, otherRange, undefined, otherFilters);
    if (pageCache.has(otherKey)) return;
    track(
      otherKey,
      loadReports(otherRange, undefined, { ...otherFilters, status: other }),
    ).request.catch(() => {});
  };

  return {
    view,
    pages,
    prefetchOtherView,
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
}: {
  pages: ActivityPages;
  kind: ActivityKind;
}) => {
  const t = useTranslations('Admin');
  const { date } = useModFormat();
  const load = useCallback((month: Date) => loadDayCounts(kind, month), [kind]);
  const peek = useCallback((month: Date) => peekDayCounts(kind, month), [kind]);
  const prefetch = useCallback(
    (month: Date) => prefetchDayCounts(kind, month),
    [kind],
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
          peek,
          prefetch,
          prefetchDay: pages.prefetchDay,
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
