import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from './client';
import { profiles, type VoiceIntro, voiceIntros } from './schema';

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
