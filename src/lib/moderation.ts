import 'server-only';

import {
  listModerationActions,
  listModerationReports,
  listModerationUsers,
  listReportsAgainstUsers,
  listSuspiciousActivity,
  type ModerationAction,
  type Report,
  searchModerationUserIds,
} from '@/db';
import type {
  ModData,
  ModLogEntry,
  ModReport,
  ModSnapshot,
  ModUser,
} from '@/features/Admin/types';
import { isAdminDiscordId } from './admin';

type ModerationUserRow = Awaited<
  ReturnType<typeof listModerationUsers>
>[number];

export const toModUser = ({
  user,
  profile,
  warnings,
}: ModerationUserRow): ModUser => ({
  id: user.id,
  displayName: user.displayName,
  username: user.discordUsername,
  discordId: user.discordUserId,
  avatarUrl: user.avatarUrl ?? undefined,
  joinedAt: user.createdAt.toISOString(),
  staff: isAdminDiscordId(user.discordUserId),
  bannedAt: user.bannedAt?.toISOString(),
  suspendedUntil: user.suspendedUntil?.toISOString(),
  hidden: profile?.hiddenByModeration ?? false,
  warnings,
  profile: profile
    ? {
        bio: profile.bio,
        isPublic: profile.isPublic,
        primaryLanguage: profile.primaryLanguage,
        targetLanguages: profile.targetLanguages,
      }
    : undefined,
});

export const toModReport = (report: Report): ModReport => ({
  id: report.id,
  userId: report.reportedUserId,
  reporterId: report.reporterUserId,
  reason: report.reason,
  details: report.details ?? undefined,
  status: report.status,
  createdAt: report.createdAt.toISOString(),
});

export const toModLogEntry = (entry: ModerationAction): ModLogEntry => ({
  id: entry.id,
  action: entry.action,
  userId: entry.targetUserId ?? undefined,
  staffId: entry.adminUserId ?? undefined,
  note: entry.note ?? undefined,
  days: entry.days ?? undefined,
  createdAt: entry.createdAt.toISOString(),
});

const withUsers = async (
  reports: Report[],
  log: ModerationAction[],
  userIds: string[],
): Promise<ModData> => {
  const ids = new Set([
    ...userIds,
    ...reports.flatMap((report) => [
      report.reportedUserId,
      report.reporterUserId,
    ]),
    ...log.flatMap((entry) =>
      [entry.targetUserId, entry.adminUserId].filter((id) => id !== null),
    ),
  ]);

  return {
    users: (await listModerationUsers([...ids])).map(toModUser),
    reports: reports.map(toModReport),
    log: log.map(toModLogEntry),
  };
};

export const loadModerationSnapshot = async (
  meId: string,
): Promise<ModSnapshot> => {
  const [reports, log, suspicious] = await Promise.all([
    listModerationReports(),
    listModerationActions(),
    listSuspiciousActivity(),
  ]);

  return {
    ...(await withUsers(
      reports,
      log,
      suspicious.flatMap((row) => (row.userId ? [row.userId] : [])),
    )),
    suspicious: suspicious.map((row) => ({
      id: row.id,
      action: row.action,
      userId: row.userId ?? undefined,
      ip: row.ip ?? undefined,
      createdAt: row.createdAt.toISOString(),
    })),
    meId,
  };
};

export const searchModeration = async (query: string) => {
  const results = await searchModerationUserIds(query);
  if (!results.length) return { results, users: [], reports: [], log: [] };
  const [reports, log] = await Promise.all([
    listReportsAgainstUsers(results),
    listModerationActions(results),
  ]);

  return { results, ...(await withUsers(reports, log, results)) };
};
