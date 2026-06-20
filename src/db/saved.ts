import 'server-only';

import { and, desc, eq } from 'drizzle-orm';
import { db } from './client';
import { listPublicProfilesByIds } from './profiles';
import { savedProfiles } from './schema';

export const listSavedProfileIds = async (userId: string) => {
  const rows = await db
    .select({ profileId: savedProfiles.profileId })
    .from(savedProfiles)
    .where(eq(savedProfiles.userId, userId))
    .orderBy(desc(savedProfiles.createdAt));

  return rows.map((row) => row.profileId);
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
