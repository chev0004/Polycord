import type { ModTab } from './ModerationDesktop';
import type {
  ActivityFilters,
  ActivityKind,
  ActivityPage,
  ModData,
  ReportView,
} from './types';

export type CachedPage<T> = {
  at: number;
  request: Promise<ActivityPage<T>>;
  page?: ActivityPage<T>;
};

export type ActivityView = { day: Date; filters: ActivityFilters };

let owner: string | null = null;

export const pageCache = new Map<string, CachedPage<unknown>>();
export const viewCache = new Map<string, ActivityView>();
export type DayCounts = Record<string, number>;

type DayEntry = {
  at: number;
  counts?: DayCounts;
  request?: Promise<DayCounts>;
};

const DAY_COUNTS_TTL_MS = 60000;
const dayCache = new Map<string, DayEntry>();
export const dataCache: { current: ModData | null } = { current: null };
export const reportViewCache = { view: 'pending' as ReportView };
export const tabCache = { tab: 'reports' as ModTab };

export const bindAdminCache = (userId: string) => {
  if (owner === userId) return;
  owner = userId;
  pageCache.clear();
  viewCache.clear();
  dayCache.clear();
  dataCache.current = null;
};

const dayKeyOf = (kind: ActivityKind, month: Date) =>
  `${kind}:${month.getFullYear()}-${month.getMonth()}`;

export const peekDayCounts = (kind: ActivityKind, month: Date) =>
  dayCache.get(dayKeyOf(kind, month))?.counts;

export const peekFreshDayCounts = (kind: ActivityKind, month: Date) => {
  const entry = dayCache.get(dayKeyOf(kind, month));
  return Date.now() - (entry?.at ?? 0) < DAY_COUNTS_TTL_MS
    ? entry?.counts
    : undefined;
};

export const staleDayCounts = () => {
  for (const entry of dayCache.values()) entry.at = 0;
};

const fetchDayCounts = async (kind: ActivityKind, month: Date) => {
  const response = await fetch(
    `/api/admin/activity-days?${new URLSearchParams({
      from: month.toISOString(),
      to: new Date(month.getFullYear(), month.getMonth() + 1, 1).toISOString(),
      kind,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })}`,
  );
  if (!response.ok) throw new Error('failed');
  return ((await response.json()) as { days: DayCounts }).days;
};

export const loadDayCounts = (kind: ActivityKind, month: Date) => {
  const key = dayKeyOf(kind, month);
  const entry = dayCache.get(key);
  if (entry?.request) return entry.request;
  if (entry?.counts && Date.now() - entry.at < DAY_COUNTS_TTL_MS)
    return Promise.resolve(entry.counts);
  const request = fetchDayCounts(kind, month).then((counts) => {
    dayCache.set(key, { at: Date.now(), counts });
    return counts;
  });
  dayCache.set(key, { at: entry?.at ?? 0, counts: entry?.counts, request });
  request.catch(() => {
    const current = dayCache.get(key);
    if (current?.request !== request) return;
    if (current.counts)
      dayCache.set(key, { at: current.at, counts: current.counts });
    else dayCache.delete(key);
  });
  return request;
};

export const prefetchDayCounts = (kind: ActivityKind, month: Date) => {
  loadDayCounts(kind, month).catch(() => {});
};

export const prefetchRecentMonths = (kinds: readonly ActivityKind[]) => {
  const now = new Date();
  for (const kind of kinds)
    for (const offset of [0, -1])
      prefetchDayCounts(
        kind,
        new Date(now.getFullYear(), now.getMonth() + offset, 1),
      );
};
