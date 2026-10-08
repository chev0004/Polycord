import 'server-only';

import { and, eq, gt, inArray, notExists, or } from 'drizzle-orm';
import { z } from 'zod';
import { isPremiumAccount } from './billing';
import { db } from './client';
import { publiclyVisible } from './profiles';
import {
  profiles,
  subscriptions,
  userBlocks,
  users,
  type VoiceIntro,
  voiceIntros,
} from './schema';

export const getVoiceIntroByUserId = async (
  userId: string,
): Promise<VoiceIntro | null> => {
  const [intro] = await db
    .select()
    .from(voiceIntros)
    .where(eq(voiceIntros.userId, userId))
    .limit(1);

  return intro ?? null;
};

export const listPlayableVoiceIntros = async (
  profileIds: string[],
  viewerUserId?: string,
) => {
  const ids = profileIds.filter((id) => z.uuid().safeParse(id).success);
  if (!ids.length) return [];

  const rows = await db
    .select({
      profileId: profiles.id,
      user: users,
      subscription: subscriptions,
      mimeType: voiceIntros.mimeType,
      data: voiceIntros.data,
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .innerJoin(voiceIntros, eq(voiceIntros.userId, profiles.userId))
    .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
    .where(
      and(
        inArray(profiles.id, ids),
        gt(profiles.voiceIntroSeconds, 0),
        publiclyVisible(),
        viewerUserId
          ? notExists(
              db
                .select({ id: userBlocks.id })
                .from(userBlocks)
                .where(
                  or(
                    and(
                      eq(userBlocks.blockerUserId, viewerUserId),
                      eq(userBlocks.blockedUserId, profiles.userId),
                    ),
                    and(
                      eq(userBlocks.blockerUserId, profiles.userId),
                      eq(userBlocks.blockedUserId, viewerUserId),
                    ),
                  ),
                ),
            )
          : undefined,
      ),
    );

  return rows
    .filter(({ user, subscription }) => isPremiumAccount(user, subscription))
    .map(({ profileId, mimeType, data }) => ({ profileId, mimeType, data }));
};

export const upsertVoiceIntroForUser = async (
  userId: string,
  values: {
    mimeType: string;
    durationSeconds: number;
    sizeBytes: number;
    data: string;
  },
) =>
  db.transaction(async (tx) => {
    const [profile] = await tx
      .update(profiles)
      .set({ voiceIntroSeconds: values.durationSeconds })
      .where(eq(profiles.userId, userId))
      .returning({ id: profiles.id });
    if (!profile) return false;

    await tx
      .insert(voiceIntros)
      .values({ userId, ...values })
      .onConflictDoUpdate({
        target: voiceIntros.userId,
        set: { ...values, updatedAt: new Date() },
      });

    return true;
  });

export const deleteVoiceIntroForUser = async (userId: string) =>
  db.transaction(async (tx) => {
    await tx.delete(voiceIntros).where(eq(voiceIntros.userId, userId));
    await tx
      .update(profiles)
      .set({ voiceIntroSeconds: null })
      .where(eq(profiles.userId, userId));
  });
