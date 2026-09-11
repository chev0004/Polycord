import 'server-only';

import { aliasedTable, asc, desc, eq, ne } from 'drizzle-orm';
import { db } from './client';
import {
  type ModerationActionKind,
  moderationActions,
  moderationRestrictions,
  profiles,
  type Report,
  reports,
  users,
} from './schema';

export type ReportQueueEntry = {
  report: Report;
  reporter: { id: string; displayName: string; discordUsername: string };
  reported: {
    id: string;
    displayName: string;
    discordUsername: string;
    suspendedUntil: Date | null;
    bannedAt: Date | null;
  };
  reportedProfile: {
    id: string;
    bio: string;
    isPublic: boolean;
    hiddenByModeration: boolean;
  } | null;
};

const reporterUsers = aliasedTable(users, 'reporter_users');

export const listReportsWithContext = async (
  limit = 100,
  page = 1,
  resolved = false,
): Promise<ReportQueueEntry[]> => {
  const rows = await db
    .select({
      report: reports,
      reporter: {
        id: reporterUsers.id,
        displayName: reporterUsers.displayName,
        discordUsername: reporterUsers.discordUsername,
      },
      reported: {
        id: users.id,
        displayName: users.displayName,
        discordUsername: users.discordUsername,
        suspendedUntil: users.suspendedUntil,
        bannedAt: users.bannedAt,
      },
      reportedProfile: {
        id: profiles.id,
        bio: profiles.bio,
        isPublic: profiles.isPublic,
        hiddenByModeration: profiles.hiddenByModeration,
      },
    })
    .from(reports)
    .innerJoin(users, eq(reports.reportedUserId, users.id))
    .innerJoin(reporterUsers, eq(reports.reporterUserId, reporterUsers.id))
    .leftJoin(profiles, eq(reports.reportedProfileId, profiles.id))
    .where(
      resolved ? ne(reports.status, 'pending') : eq(reports.status, 'pending'),
    )
    .orderBy(asc(reports.createdAt), asc(reports.id))
    .offset((page - 1) * limit)
    .limit(limit);

  return rows;
};

export const getReportById = async (reportId: string) => {
  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);

  return report ?? null;
};

export const setReportStatus = async (
  reportId: string,
  status: Report['status'],
) => {
  await db.update(reports).set({ status }).where(eq(reports.id, reportId));
};

export const getModerationRestrictionByDiscordId = async (
  discordUserId: string,
) => {
  const [restriction] = await db
    .select()
    .from(moderationRestrictions)
    .where(eq(moderationRestrictions.discordUserId, discordUserId));
  return restriction ?? null;
};

const setRestriction = async (
  userId: string,
  values: Partial<
    Omit<typeof moderationRestrictions.$inferInsert, 'discordUserId'>
  >,
) =>
  db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .for('update');
    if (!user) throw new Error('User not found');
    await tx
      .insert(moderationRestrictions)
      .values({ discordUserId: user.discordUserId, ...values })
      .onConflictDoUpdate({
        target: moderationRestrictions.discordUserId,
        set: values,
      });
    if (values.hiddenByModeration !== undefined) {
      await tx
        .update(profiles)
        .set({
          hiddenByModeration: values.hiddenByModeration,
          updatedAt: new Date(),
        })
        .where(eq(profiles.userId, userId));
    } else {
      await tx
        .update(users)
        .set({
          bannedAt: values.bannedAt,
          suspendedUntil: values.suspendedUntil,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }
  });

export const setProfileHiddenByModeration = async (
  userId: string,
  hidden: boolean,
) => setRestriction(userId, { hiddenByModeration: hidden });

export const setUserSuspendedUntil = async (
  userId: string,
  suspendedUntil: Date | null,
) => setRestriction(userId, { suspendedUntil });

export const setUserBanned = async (userId: string, banned: boolean) =>
  setRestriction(userId, { bannedAt: banned ? new Date() : null });

export const logModerationAction = async (values: {
  adminUserId: string;
  targetUserId: string;
  reportId?: string | null;
  action: ModerationActionKind;
  note?: string | null;
}) => {
  const [action] = await db
    .insert(moderationActions)
    .values({
      adminUserId: values.adminUserId,
      targetUserId: values.targetUserId,
      reportId: values.reportId ?? null,
      action: values.action,
      note: values.note?.trim() ? values.note.trim() : null,
    })
    .returning();

  return action;
};

export type ModerationLogEntry = {
  id: string;
  action: ModerationActionKind;
  note: string | null;
  createdAt: Date;
  adminName: string | null;
  targetName: string | null;
};

const adminUsers = aliasedTable(users, 'admin_users');

export const listModerationActions = async (
  limit = 50,
): Promise<ModerationLogEntry[]> => {
  const rows = await db
    .select({
      id: moderationActions.id,
      action: moderationActions.action,
      note: moderationActions.note,
      createdAt: moderationActions.createdAt,
      adminName: adminUsers.displayName,
      targetName: users.displayName,
    })
    .from(moderationActions)
    .leftJoin(adminUsers, eq(moderationActions.adminUserId, adminUsers.id))
    .leftJoin(users, eq(moderationActions.targetUserId, users.id))
    .orderBy(desc(moderationActions.createdAt))
    .limit(limit);

  return rows;
};

export const isUserRestricted = (user: {
  suspendedUntil: Date | null;
  bannedAt: Date | null;
}) =>
  user.bannedAt !== null ||
  (user.suspendedUntil !== null && user.suspendedUntil.getTime() > Date.now());
