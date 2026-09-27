import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  like,
  ne,
  or,
  sql,
} from 'drizzle-orm';
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
  targetUserId: string;
  reportId?: string | null;
  action: ModerationActionKind;
  note?: string | null;
  days?: number;
}) => {
  const [action] = await db
    .insert(moderationActions)
    .values({
      adminUserId: values.adminUserId,
      targetUserId: values.targetUserId,
      reportId: values.reportId ?? null,
      action: values.action,
      note: values.note?.trim() ? values.note.trim() : null,
      days: values.days ?? null,
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

export const listModerationUsers = async (userIds: string[]) => {
  if (!userIds.length) return [];

  const [rows, warnings] = await Promise.all([
    db
      .select({ user: users, profile: profiles, staffRole: staffRoles.role })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .leftJoin(staffRoles, eq(staffRoles.userId, users.id))
      .where(inArray(users.id, userIds)),
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
  ]);
  const targetLanguages = await listTargetLanguagesByProfileIds(
    rows.flatMap(({ profile }) => (profile ? [profile.id] : [])),
  );

  return rows.map(({ user, profile, staffRole }) => ({
    user,
    staffRole,
    profile: profile && {
      ...profile,
      targetLanguages: targetLanguagesForProfile(
        profile,
        targetLanguages.get(profile.id),
      ),
    },
    warnings:
      warnings.find((warning) => warning.userId === user.id)?.count ?? 0,
  }));
};

export const searchModerationUserIds = async (query: string) => {
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
    .orderBy(asc(users.displayName))
    .limit(20);

  return rows.map(({ id }) => id);
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

export const isUserRestricted = (user: {
  suspendedUntil: Date | null;
  bannedAt: Date | null;
}) =>
  user.bannedAt !== null ||
  (user.suspendedUntil !== null && user.suspendedUntil.getTime() > Date.now());
