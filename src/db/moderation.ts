import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  inArray,
  like,
  ne,
  or,
  type SQLWrapper,
  sql,
} from 'drizzle-orm';
import type { ModState } from '@/features/Admin/types';
import { ACTIVITY_PAGE_SIZE, type ActivityWindow } from '@/lib/activityWindow';
import type { GrantUnit } from '@/lib/premiumGrant';
import { afterCursor, cursorAt, withinWindow } from './activityWindow';
import { db } from './client';
import {
  listTargetLanguagesByProfileIds,
  targetLanguagesForProfile,
} from './profiles';
import {
  type ModerationActionKind,
  moderationActions,
  moderationRestrictions,
  profiles,
  type Report,
  reports,
  staffRoles,
  subscriptions,
  users,
} from './schema';

export const listModerationReports = async () => {
  const [pending, resolved] = await Promise.all([
    db
      .select()
      .from(reports)
      .where(eq(reports.status, 'pending'))
      .orderBy(desc(reports.createdAt))
      .limit(1000),
    db
      .select()
      .from(reports)
      .where(ne(reports.status, 'pending'))
      .orderBy(desc(reports.createdAt))
      .limit(200),
  ]);

  return [...pending, ...resolved];
};

export const listReportsAgainstUsers = async (userIds: string[]) =>
  userIds.length
    ? db
        .select()
        .from(reports)
        .where(inArray(reports.reportedUserId, userIds))
        .orderBy(desc(reports.createdAt))
    : [];

export const getReportById = async (reportId: string) => {
  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);

  return report ?? null;
};

export const countPendingCases = async () => {
  const [row] = await db
    .select({ cases: sql<number>`count(distinct ${reports.reportedUserId})` })
    .from(reports)
    .where(eq(reports.status, 'pending'));
  return Number(row.cases);
};

export const resolveReports = async (
  reportIds: string[],
  targetUserId: string,
  status: Report['status'],
) =>
  reportIds.length
    ? db
        .update(reports)
        .set({ status })
        .where(
          and(
            inArray(reports.id, reportIds),
            eq(reports.reportedUserId, targetUserId),
            eq(reports.status, 'pending'),
          ),
        )
        .returning()
    : [];

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
  targetUserId: string | null;
  reportId?: string | null;
  action: ModerationActionKind;
  note?: string | null;
  warningCategory?: string | null;
  days?: number;
  grant?: { amount: number; unit: GrantUnit };
  expiresAt?: Date;
}) => {
  const [action] = await db
    .insert(moderationActions)
    .values({
      adminUserId: values.adminUserId,
      targetUserId: values.targetUserId,
      reportId: values.reportId ?? null,
      action: values.action,
      note: values.note?.trim() ? values.note.trim() : null,
      warningCategory: values.warningCategory ?? null,
      days: values.days ?? null,
      grantAmount: values.grant?.amount ?? null,
      grantUnit: values.grant?.unit ?? null,
      expiresAt: values.expiresAt ?? null,
    })
    .returning();

  return action;
};

export const listModerationActions = async (targetUserIds?: string[]) =>
  db
    .select()
    .from(moderationActions)
    .where(
      targetUserIds
        ? inArray(moderationActions.targetUserId, targetUserIds)
        : undefined,
    )
    .orderBy(desc(moderationActions.createdAt))
    .limit(200);

export const listModerationActionsPage = async (window: ActivityWindow) =>
  db
    .select({
      ...getTableColumns(moderationActions),
      cursorAt: cursorAt(moderationActions.createdAt),
    })
    .from(moderationActions)
    .where(
      and(
        withinWindow(moderationActions.createdAt, window),
        window.action ? eq(moderationActions.action, window.action) : undefined,
        window.staffId
          ? eq(moderationActions.adminUserId, window.staffId)
          : undefined,
        afterCursor(
          moderationActions.createdAt,
          moderationActions.id,
          window.cursor,
        ),
      ),
    )
    .orderBy(desc(moderationActions.createdAt), desc(moderationActions.id))
    .limit(ACTIVITY_PAGE_SIZE + 1);

const warningCount = sql<number>`(select count(*)::int from ${moderationActions} where ${moderationActions.targetUserId} = ${users.id} and ${moderationActions.action} = 'warn')`;

const findModerationUsers = async (userIds: string[] | SQLWrapper) => {
  const [rows, targetLanguages] = await Promise.all([
    db
      .select({
        user: users,
        profile: profiles,
        staffRole: staffRoles.role,
        subscription: subscriptions,
        warnings: warningCount,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .leftJoin(staffRoles, eq(staffRoles.userId, users.id))
      .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
      .where(inArray(users.id, userIds)),
    listTargetLanguagesByProfileIds(
      db
        .select({ id: profiles.id })
        .from(profiles)
        .where(inArray(profiles.userId, userIds)),
    ),
  ]);

  return rows.map(({ user, profile, staffRole, subscription, warnings }) => ({
    user,
    staffRole,
    subscription,
    profile: profile && {
      ...profile,
      targetLanguages: targetLanguagesForProfile(
        profile,
        targetLanguages.get(profile.id),
      ),
    },
    warnings,
  }));
};

export const listModerationUsers = async (userIds: string[]) =>
  userIds.length ? findModerationUsers(userIds) : [];

export const loadCaseRecords = async (profileId: string) => {
  const target = sql`(select ${profiles.userId} from ${profiles} where ${profiles.id} = ${profileId})`;
  const related = sql`(select ${profiles.userId} from ${profiles} where ${profiles.id} = ${profileId} union select ${reports.reporterUserId} from ${reports} where ${reports.reportedUserId} in ${target} union select ${moderationActions.targetUserId} from ${moderationActions} where ${moderationActions.targetUserId} in ${target} union select ${moderationActions.adminUserId} from ${moderationActions} where ${moderationActions.targetUserId} in ${target})`;
  const [caseReports, log, caseUsers] = await Promise.all([
    db
      .select()
      .from(reports)
      .where(inArray(reports.reportedUserId, target))
      .orderBy(desc(reports.createdAt)),
    db
      .select()
      .from(moderationActions)
      .where(inArray(moderationActions.targetUserId, target))
      .orderBy(desc(moderationActions.createdAt))
      .limit(200),
    findModerationUsers(related),
  ]);

  return { reports: caseReports, log, users: caseUsers };
};

export const listModerationStatesByProfileId = async (profileIds: string[]) => {
  if (!profileIds.length) return new Map<string, ModState>();

  const rows = await db
    .select({
      profileId: profiles.id,
      userId: users.id,
      hidden: profiles.hiddenByModeration,
      bannedAt: users.bannedAt,
      suspendedUntil: users.suspendedUntil,
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(inArray(profiles.id, profileIds));
  const userIds = rows.map(({ userId }) => userId);
  const [warned, pending] = await Promise.all([
    db
      .select({ userId: moderationActions.targetUserId, count: count() })
      .from(moderationActions)
      .where(
        and(
          inArray(moderationActions.targetUserId, userIds),
          eq(moderationActions.action, 'warn'),
        ),
      )
      .groupBy(moderationActions.targetUserId),
    db
      .select({ userId: reports.reportedUserId, count: count() })
      .from(reports)
      .where(
        and(
          inArray(reports.reportedUserId, userIds),
          eq(reports.status, 'pending'),
        ),
      )
      .groupBy(reports.reportedUserId),
  ]);
  const now = Date.now();

  return new Map<string, ModState>(
    rows.map((row) => [
      row.profileId,
      {
        hidden: row.hidden,
        suspended: (row.suspendedUntil?.getTime() ?? 0) > now,
        banned: row.bannedAt !== null,
        warnings:
          warned.find(({ userId }) => userId === row.userId)?.count ?? 0,
        pendingReports:
          pending.find(({ userId }) => userId === row.userId)?.count ?? 0,
      },
    ]),
  );
};

export const ADMIN_SEARCH_PAGE_SIZE = 20;

export const searchModerationUserIds = async (query: string, offset = 0) => {
  const term = `%${query.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(
      or(
        eq(users.discordUserId, query),
        like(sql`lower(${users.discordUsername})`, term),
        like(sql`lower(${users.displayName})`, term),
      ),
    )
    .orderBy(asc(users.displayName), asc(users.id))
    .limit(ADMIN_SEARCH_PAGE_SIZE + 1)
    .offset(offset);

  return {
    ids: rows.slice(0, ADMIN_SEARCH_PAGE_SIZE).map(({ id }) => id),
    hasMore: rows.length > ADMIN_SEARCH_PAGE_SIZE,
  };
};

export const hasStaffRole = async (userId: string) =>
  (
    await db
      .select({ userId: staffRoles.userId })
      .from(staffRoles)
      .where(eq(staffRoles.userId, userId))
  ).length > 0;

export const listStaffUserIds = async (ownerDiscordIds: string[]) => {
  const [moderators, owners] = await Promise.all([
    db.select({ id: staffRoles.userId }).from(staffRoles),
    ownerDiscordIds.length
      ? db
          .select({ id: users.id })
          .from(users)
          .where(inArray(users.discordUserId, ownerDiscordIds))
      : [],
  ]);

  return [...owners, ...moderators].map(({ id }) => id);
};

export const grantModerator = async (userId: string, grantedBy: string) =>
  (
    await db
      .insert(staffRoles)
      .values({ userId, grantedBy })
      .onConflictDoNothing()
      .returning()
  ).length > 0;

export const revokeModerator = async (userId: string) =>
  (await db.delete(staffRoles).where(eq(staffRoles.userId, userId)).returning())
    .length > 0;

export const isSuspended = (user: { suspendedUntil: Date | null }) =>
  user.suspendedUntil !== null && user.suspendedUntil.getTime() > Date.now();

export const isUserRestricted = (user: {
  suspendedUntil: Date | null;
  bannedAt: Date | null;
}) => user.bannedAt !== null || isSuspended(user);
