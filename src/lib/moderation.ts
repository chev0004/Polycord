import 'server-only';

import { z } from 'zod';
import {
  countActivityByDay,
  countPendingCases,
  hasActivePremiumGrant,
  isSubscriptionActive,
  listActionedPage,
  listModerationActions,
  listModerationActionsPage,
  listModerationStatesByProfileId,
  listModerationUsers,
  listReportsAgainstUsers,
  listReportsPage,
  listStaffUserIds,
  listSuspiciousEvents,
  listSuspiciousGroups,
  loadCaseRecords,
  type ModerationAction,
  type Report,
  searchModerationUserIds,
} from '@/db';
import type {
  ModActioned,
  ModData,
  ModLogEntry,
  ModReport,
  ModSnapshot,
  ModSuspicious,
  ModSuspiciousEvent,
  ModUser,
  StaffRole,
} from '@/features/Admin/types';
import type { WarningCategory } from '@/types';
import {
  type ActivityDaysQuery,
  type ActivityWindow,
  pageOf,
} from './activityWindow';
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
  category: (entry.warningCategory as WarningCategory | null) ?? undefined,
  days: entry.days ?? undefined,
  grant:
    entry.grantAmount && entry.grantUnit
      ? { amount: entry.grantAmount, unit: entry.grantUnit }
      : undefined,
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

export const withModerationStates = async <T extends { id: string }>(
  profiles: T[],
) => {
  const states = await listModerationStatesByProfileId(
    profiles.map(({ id }) => id),
  );
  return profiles.map((profile) => ({
    ...profile,
    moderation: states.get(profile.id),
  }));
};

export const loadProfileCase = async (profileId: string) => {
  if (!z.uuid().safeParse(profileId).success) return null;

  const records = await loadCaseRecords(profileId);
  const target = records.users.find(({ profile }) => profile?.id === profileId);
  if (!target) return null;

  return {
    userId: target.user.id,
    users: records.users.map(toModUser),
    reports: records.reports.map(toModReport),
    log: records.log.map(toModLogEntry),
  };
};

export const loadModerationSnapshot = async (
  meId: string,
  meRole: StaffRole,
  today?: { from: Date; to: Date } | null,
): Promise<ModSnapshot> => {
  const [staff, pendingCases, first] = await Promise.all([
    listStaffUserIds(ownerDiscordIds()),
    countPendingCases(),
    today ? loadReportsPage({ ...today, status: 'pending' }) : null,
  ]);
  const data = await withUsers([], [], staff);

  return {
    users: first
      ? [
          ...first.users,
          ...data.users.filter(
            (user) => !first.users.some((u) => u.id === user.id),
          ),
        ]
      : data.users,
    reports: first?.reports ?? data.reports,
    log: first?.log ?? data.log,
    staff,
    meRole,
    pendingCases,
    meId,
    firstPage:
      today && first
        ? {
            scope: 'reports:pending',
            range: {
              from: today.from.toISOString(),
              to: today.to.toISOString(),
            },
            page: { rows: first.page, nextCursor: first.nextCursor },
          }
        : undefined,
  };
};

export const searchModeration = async (query: string, offset = 0) => {
  const { ids: results, hasMore } = await searchModerationUserIds(
    query,
    offset,
  );
  if (!results.length)
    return { results, hasMore, users: [], reports: [], log: [] };
  const [reports, log] = await Promise.all([
    listReportsAgainstUsers(results),
    listModerationActions(results),
  ]);

  return { results, hasMore, ...(await withUsers(reports, log, results)) };
};

const toSuspiciousEvent = (row: {
  id: string;
  action: string;
  userId: string | null;
  ip: string | null;
  createdAt: Date;
}): ModSuspiciousEvent => ({
  id: row.id,
  action: row.action,
  userId: row.userId ?? undefined,
  ip: row.ip ?? undefined,
  createdAt: row.createdAt.toISOString(),
});

export const loadActivityLogPage = async (window: ActivityWindow) => {
  const { page, nextCursor } = pageOf(await listModerationActionsPage(window));
  return { nextCursor, ...(await withUsers([], page, [])) };
};

export const loadReportsPage = async (window: ActivityWindow) => {
  const { page, nextCursor } = pageOf(await listReportsPage(window));
  const userIds = [...new Set(page.map((report) => report.reportedUserId))];
  const [reports, log] = await Promise.all([
    listReportsAgainstUsers(userIds),
    listModerationActions(userIds),
  ]);
  return {
    nextCursor,
    page: page.map(toModReport),
    ...(await withUsers(reports, log, userIds)),
  };
};

export const loadActionedPage = async (window: ActivityWindow) => {
  const { page, nextCursor } = pageOf(await listActionedPage(window));
  const rows: ModActioned[] = page.flatMap((row) =>
    row.userId
      ? {
          id: row.id,
          userId: row.userId,
          action: row.action,
          count: row.total,
          createdAt: row.createdAt.toISOString(),
        }
      : [],
  );
  const userIds = rows.map(({ userId }) => userId);
  const [reports, log] = await Promise.all([
    listReportsAgainstUsers(userIds),
    listModerationActions(userIds),
  ]);
  return {
    nextCursor,
    actioned: rows,
    ...(await withUsers(reports, log, userIds)),
  };
};

export const loadSuspiciousPage = async (window: ActivityWindow) => {
  const { page, nextCursor } = pageOf(await listSuspiciousGroups(window));
  const activity: ModSuspicious[] = page.map((row) => ({
    ...toSuspiciousEvent(row),
    count: row.total,
  }));
  return {
    nextCursor,
    activity,
    ...(await withUsers(
      [],
      [],
      activity.flatMap(({ userId }) => userId ?? []),
    )),
  };
};

export const loadSuspiciousEvents = async (
  userId: string,
  window: ActivityWindow,
  offset: number,
) => {
  const { events, hasMore } = await listSuspiciousEvents(
    userId,
    window,
    offset,
  );
  return { events: events.map(toSuspiciousEvent), hasMore };
};

export const loadActivityDays = async ({
  kind,
  from,
  to,
  timeZone,
}: ActivityDaysQuery) => ({
  days: await countActivityByDay(kind, { from, to }, timeZone),
});
