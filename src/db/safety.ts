import 'server-only';

import { and, desc, eq, or } from 'drizzle-orm';
import { db } from './client';
import {
  type NewReport,
  type ReportReason,
  reports,
  userBlocks,
  users,
} from './schema';

export type CreateReportInput = {
  reporterUserId: string;
  reportedUserId: string;
  reportedProfileId?: string | null;
  reason: ReportReason;
  details?: string | null;
};

export const createReport = async (input: CreateReportInput) => {
  const values: NewReport = {
    reporterUserId: input.reporterUserId,
    reportedUserId: input.reportedUserId,
    reportedProfileId: input.reportedProfileId ?? null,
    reason: input.reason,
    details: input.details?.trim() ? input.details.trim() : null,
  };

  const [report] = await db.insert(reports).values(values).returning();

  return report;
};

export const blockUser = async (
  blockerUserId: string,
  blockedUserId: string,
) => {
  await db
    .insert(userBlocks)
    .values({ blockerUserId, blockedUserId })
    .onConflictDoNothing({
      target: [userBlocks.blockerUserId, userBlocks.blockedUserId],
    });
};

export const unblockUser = async (
  blockerUserId: string,
  blockedUserId: string,
) => {
  await db
    .delete(userBlocks)
    .where(
      and(
        eq(userBlocks.blockerUserId, blockerUserId),
        eq(userBlocks.blockedUserId, blockedUserId),
      ),
    );
};

export const isBlockedEitherWay = async (
  userId: string,
  otherUserId: string,
) => {
  const [row] = await db
    .select({ id: userBlocks.id })
    .from(userBlocks)
    .where(
      or(
        and(
          eq(userBlocks.blockerUserId, userId),
          eq(userBlocks.blockedUserId, otherUserId),
        ),
        and(
          eq(userBlocks.blockerUserId, otherUserId),
          eq(userBlocks.blockedUserId, userId),
        ),
      ),
    )
    .limit(1);

  return Boolean(row);
};

export const listBlockedUserIds = async (userId: string): Promise<string[]> => {
  const rows = await db
    .select({
      blockerUserId: userBlocks.blockerUserId,
      blockedUserId: userBlocks.blockedUserId,
    })
    .from(userBlocks)
    .where(
      or(
        eq(userBlocks.blockerUserId, userId),
        eq(userBlocks.blockedUserId, userId),
      ),
    );
  return rows.map((row) =>
    row.blockerUserId === userId ? row.blockedUserId : row.blockerUserId,
  );
};

export const listBlockedUsers = async (userId: string) =>
  db
    .select({ id: users.id, displayName: users.displayName })
    .from(userBlocks)
    .innerJoin(users, eq(users.id, userBlocks.blockedUserId))
    .where(eq(userBlocks.blockerUserId, userId))
    .orderBy(desc(userBlocks.createdAt));
