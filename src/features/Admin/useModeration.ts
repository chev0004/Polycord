'use client';

import { useCallback, useMemo, useState } from 'react';
import type {
  ModData,
  ModLogEntry,
  ModReport,
  ModRequest,
  ModSnapshot,
  ModUser,
} from './types';

export type ReportGroup = { userId: string; reports: ModReport[] };

const byNewest = (a: { createdAt: string }, b: { createdAt: string }) =>
  b.createdAt.localeCompare(a.createdAt);

const mergeById = <T extends { id: string }>(current: T[], next: T[]) => [
  ...next,
  ...current.filter((item) => !next.some((entry) => entry.id === item.id)),
];

export const isSuspended = (user: ModUser) =>
  user.suspendedUntil !== undefined &&
  new Date(user.suspendedUntil).getTime() > Date.now();

export const hasStatusChips = (user: ModUser) =>
  user.staff || user.hidden || user.bannedAt !== undefined || isSuspended(user);

export const groupReports = (
  reports: ModReport[],
  view: 'pending' | 'resolved',
): ReportGroup[] => {
  const groups = new Map<string, ModReport[]>();
  for (const report of reports) {
    if ((report.status === 'pending') !== (view === 'pending')) continue;
    groups.set(report.userId, [...(groups.get(report.userId) ?? []), report]);
  }
  return [...groups]
    .map(([userId, grouped]) => ({ userId, reports: grouped.sort(byNewest) }))
    .sort((a, b) => byNewest(a.reports[0], b.reports[0]));
};

export const useModeration = (initial: ModSnapshot) => {
  const [data, setData] = useState<ModData>(initial);

  const merge = useCallback(
    (next: ModData) =>
      setData((current) => ({
        users: mergeById(current.users, next.users),
        reports: mergeById(current.reports, next.reports).sort(byNewest),
        log: mergeById(current.log, next.log).sort(byNewest),
      })),
    [],
  );

  const act = useCallback(
    async (request: ModRequest) => {
      const response = await fetch('/api/admin/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...request,
          note: request.note.trim() || undefined,
        }),
      });
      if (!response.ok) throw new Error('Moderation action failed');
      merge(await response.json());
    },
    [merge],
  );

  const search = useCallback(
    async (query: string): Promise<string[]> => {
      const response = await fetch(
        `/api/admin/users?q=${encodeURIComponent(query)}`,
      );
      if (!response.ok) throw new Error('Search failed');
      const result: ModData & { results: string[] } = await response.json();
      merge(result);
      return result.results;
    },
    [merge],
  );

  const usersById = useMemo(
    () => new Map(data.users.map((user) => [user.id, user])),
    [data.users],
  );

  const pendingGroups = useMemo(
    () => groupReports(data.reports, 'pending'),
    [data.reports],
  );

  const userLog = (userId: string): ModLogEntry[] =>
    data.log.filter((entry) => entry.userId === userId);

  const userReports = (userId: string) =>
    data.reports.filter((report) => report.userId === userId);

  const recentUserIds = [
    ...new Set(data.log.flatMap((entry) => entry.userId ?? [])),
  ].slice(0, 6);

  return {
    ...data,
    usersById,
    pendingGroups,
    suspicious: initial.suspicious,
    meId: initial.meId,
    act,
    search,
    userLog,
    userReports,
    recentUserIds,
  };
};

export type ModerationStore = ReturnType<typeof useModeration>;
