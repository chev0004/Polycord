'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { GrantUnit } from '@/lib/premiumGrant';
import type {
  IpBlock,
  ModData,
  ModLogEntry,
  ModReport,
  ModRequest,
  ModSnapshot,
  ModState,
  ModSuspiciousEvent,
  ModUser,
  ObservedIp,
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

export const toModState = (
  user: ModUser,
  pendingReports: number,
): ModState => ({
  hidden: user.hidden,
  suspended: isSuspended(user),
  banned: user.bannedAt !== undefined,
  warnings: user.warnings,
  pendingReports,
});

export const hasStatusChips = (user: ModUser) =>
  user.role !== undefined ||
  user.hidden ||
  user.bannedAt !== undefined ||
  isSuspended(user);

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

export const isReauthError = (error: unknown) =>
  error instanceof Error && error.message === 'reauth';

const send = async (url: string, method: string, body: object) => {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(response.status === 401 ? 'reauth' : 'failed');
  }
  return response.json();
};

export const useModeration = (initial: ModSnapshot) => {
  const [data, setData] = useState<ModData>(initial);
  const [staff, setStaff] = useState(initial.staff);

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
    async (request: ModRequest) =>
      merge(
        await send('/api/admin/moderation', 'POST', {
          ...request,
          note: request.note.trim() || undefined,
        }),
      ),
    [merge],
  );

  const changeStaff = useCallback(
    async (method: 'POST' | 'DELETE', target: object) => {
      const result: ModData & { staff: string[] } = await send(
        '/api/admin/staff',
        method,
        target,
      );
      merge(result);
      setStaff(result.staff);
    },
    [merge],
  );

  const changePremium = useCallback(
    async (method: 'POST' | 'DELETE', body: object) =>
      merge(await send('/api/admin/premium', method, body)),
    [merge],
  );

  const loadIpBlocks = useCallback(async (userId?: string) => {
    const response = await fetch(
      `/api/admin/ip-bans${userId ? `?userId=${userId}` : ''}`,
    );
    if (!response.ok) throw new Error('failed');
    return (await response.json()) as {
      bans: IpBlock[];
      observed: ObservedIp[];
    };
  }, []);

  const changeIpBlocks = useCallback(
    async (method: 'POST' | 'DELETE', body: object) => {
      const result: { bans: IpBlock[]; log: ModLogEntry[] } = await send(
        '/api/admin/ip-bans',
        method,
        body,
      );
      merge({ users: [], reports: [], log: result.log });
      return result.bans;
    },
    [merge],
  );

  const loadSuspiciousEvents = useCallback(async (userId: string) => {
    const response = await fetch(
      `/api/admin/suspicious-activity?userId=${userId}`,
    );
    if (!response.ok) throw new Error('failed');
    return ((await response.json()) as { events: ModSuspiciousEvent[] }).events;
  }, []);

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

  const initialGroups = useRef(
    groupReports(initial.reports, 'pending').length,
  ).current;
  const pendingCases =
    initial.pendingCases + pendingGroups.length - initialGroups;

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
    pendingCases,
    suspicious: initial.suspicious,
    meId: initial.meId,
    meRole: initial.meRole,
    staff,
    grant: (target: { userId: string } | { discordId: string }) =>
      changeStaff('POST', target),
    revoke: (userId: string) => changeStaff('DELETE', { userId }),
    grantPremium: (userId: string, amount: number, unit: GrantUnit) =>
      changePremium('POST', { userId, amount, unit }),
    revokePremium: (userId: string) => changePremium('DELETE', { userId }),
    loadIpBlocks,
    loadSuspiciousEvents,
    blockIps: (body: { ips: string[]; userId?: string; reason?: string }) =>
      changeIpBlocks('POST', body),
    unblockIp: (id: string) => changeIpBlocks('DELETE', { id }),
    act,
    search,
    userLog,
    userReports,
    recentUserIds,
  };
};

export type ModerationStore = ReturnType<typeof useModeration>;
