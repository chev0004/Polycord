import 'server-only';

import { and, desc, eq } from 'drizzle-orm';
import { db } from './client';
import { listPublicProfilesByIds } from './profiles';
import { savedProfiles } from './schema';

const missingSavedProfilesStorageCodes = new Set(['42P01', '42703']);

const getErrorCode = (error: unknown) =>
  error && typeof error === 'object' && 'code' in error
    ? String(error.code)
    : null;

const getErrorCause = (error: unknown) =>
  error && typeof error === 'object' && 'cause' in error ? error.cause : null;

const isMissingSavedProfilesStorageError = (error: unknown): boolean => {
  let current: unknown = error;

  while (current) {
    const code = getErrorCode(current);

    if (code && missingSavedProfilesStorageCodes.has(code)) {
      return true;
    }

    current = getErrorCause(current);
  }

  return false;
};

export const listSavedProfileIds = async (userId: string) => {
  try {
    const rows = await db
      .select({ profileId: savedProfiles.profileId })
      .from(savedProfiles)
      .where(eq(savedProfiles.userId, userId))
      .orderBy(desc(savedProfiles.createdAt));

    return rows.map((row) => row.profileId);
  } catch (error) {
    if (isMissingSavedProfilesStorageError(error)) {
      return [];
    }

    throw error;
  }
};

export const listSavedProfiles = async (userId: string) => {
  const profileIds = await listSavedProfileIds(userId);

  return listPublicProfilesByIds(profileIds);
};

export const saveProfile = async (userId: string, profileId: string) => {
  await db
    .insert(savedProfiles)
    .values({ userId, profileId })
    .onConflictDoNothing({
      target: [savedProfiles.userId, savedProfiles.profileId],
    });
};

export const unsaveProfile = async (userId: string, profileId: string) => {
  await db
    .delete(savedProfiles)
    .where(
      and(
        eq(savedProfiles.userId, userId),
        eq(savedProfiles.profileId, profileId),
      ),
    );
};
