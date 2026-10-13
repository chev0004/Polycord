import type { ModTab } from './ModerationDesktop';
import type {
  ActivityFilters,
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
export const dayCache = new Map<
  string,
  { at: number; days: Promise<Record<string, number>> }
>();
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
