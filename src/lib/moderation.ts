import 'server-only';

import {
  hasActivePremiumGrant,
  isSubscriptionActive,
  listModerationActions,
  listModerationReports,
  listModerationUsers,
  listReportsAgainstUsers,
  listStaffUserIds,
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
  StaffRole,
} from '@/features/Admin/types';
import { isOwnerDiscordId, ownerDiscordIds } from './admin';
import { isPremiumDiscordId } from './entitlements';

type ModerationUserRow = Awaited<
  ReturnType<typeof listModerationUsers>
>[number];

export const staffRoleOf = ({
  user,
  staffRole,
}: ModerationUserRow): StaffRole | undefined =>
  isOwnerDiscordId(user.discordUserId) ? 'owner' : (staffRole ?? undefined);

export const toModUser = (row: ModerationUserRow): ModUser => {
  const { user, profile, warnings, subscription } = row;
  return {
    id: user.id,
    displayName: user.displayName,
    username: user.discordUsername,
    discordId: user.discordUserId,
    avatarUrl: user.avatarUrl ?? undefined,
    joinedAt: user.createdAt.toISOString(),
    role: staffRoleOf(row),
    bannedAt: user.bannedAt?.toISOString(),
    suspendedUntil: user.suspendedUntil?.toISOString(),
    hidden: profile?.hiddenByModeration ?? false,
    warnings,
    premium: {
      grantedUntil: hasActivePremiumGrant(user)
        ? user.premiumGrantedUntil?.toISOString()
        : undefined,
      subscriptionUntil: isSubscriptionActive(subscription)
        ? subscription?.currentPeriodEnd?.toISOString()
        : undefined,
      configured: isPremiumDiscordId(user.discordUserId),
    },
    profile: profile
      ? {
          bio: profile.bio,
          isPublic: profile.isPublic,
          primaryLanguage: profile.primaryLanguage,
          targetLanguages: profile.targetLanguages,
        }
      : undefined,
  };
};

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
  expiresAt: entry.expiresAt?.toISOString(),
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
  meRole: StaffRole,
): Promise<ModSnapshot> => {
  const [reports, log, suspicious, staff] = await Promise.all([
    listModerationReports(),
    listModerationActions(),
    listSuspiciousActivity(),
    listStaffUserIds(ownerDiscordIds()),
  ]);

  return {
    ...(await withUsers(reports, log, [
      ...staff,
      ...suspicious.flatMap((row) => (row.userId ? [row.userId] : [])),
    ])),
    staff,
    meRole,
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
