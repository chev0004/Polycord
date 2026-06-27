import 'server-only';

import { and, eq } from 'drizzle-orm';
import { db } from './client';
import {
  type NewReport,
  type ReportReason,
  reports,
  userBlocks,
} from './schema';

const missingSafetyStorageCodes = new Set(['42P01', '42703', '42704']);

const getErrorCode = (error: unknown) =>
  error && typeof error === 'object' && 'code' in error
    ? String(error.code)
    : null;

const getErrorCause = (error: unknown) =>
  error && typeof error === 'object' && 'cause' in error ? error.cause : null;

const isMissingSafetyStorageError = (error: unknown): boolean => {
  let current: unknown = error;

  while (current) {
    const code = getErrorCode(current);

    if (code && missingSafetyStorageCodes.has(code)) {
      return true;
    }

    current = getErrorCause(current);
  }

  return false;
};

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

export const listBlockedUserIds = async (
  blockerUserId: string,
): Promise<string[]> => {
  try {
    const rows = await db
      .select({ blockedUserId: userBlocks.blockedUserId })
      .from(userBlocks)
      .where(eq(userBlocks.blockerUserId, blockerUserId));

    return rows.map((row) => row.blockedUserId);
  } catch (error) {
    if (isMissingSafetyStorageError(error)) {
      return [];
    }

    throw error;
  }
};
