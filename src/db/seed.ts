import 'server-only';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { count, desc, eq, inArray, max } from 'drizzle-orm';
import {
  generateDummy,
  SEED_BATCH_SIZE,
  SEED_VOICES,
  seedIndex,
} from '@/lib/seed/generate';
import { db } from './client';
import {
  moderationRestrictions,
  profiles,
  profileTargetLanguages,
  seedDatabase,
  subscriptions,
  users,
  voiceIntros,
} from './schema';

const SEED_PREMIUM_YEARS = 10;

export const getSeedDatabase = async () => {
  const [row] = await db.select().from(seedDatabase).limit(1);
  return row ?? null;
};

export const countAccounts = async () => {
  const rows = await db
    .select({ synthetic: users.isSynthetic, total: count() })
    .from(users)
    .groupBy(users.isSynthetic);
  return {
    real: rows.find((row) => !row.synthetic)?.total ?? 0,
    dummies: rows.find((row) => row.synthetic)?.total ?? 0,
  };
};

export const addDummies = async (amount: number) => {
  const [{ highest }] = await db
    .select({ highest: max(users.discordUserId) })
    .from(users)
    .where(eq(users.isSynthetic, true));
  const start = highest ? seedIndex(highest) + 1 : 1;
  const now = new Date();
  const dummies = Array.from(
    { length: Math.min(amount, SEED_BATCH_SIZE) },
    (_, offset) => generateDummy(start + offset, now),
  );
  const clips = new Map(
    await Promise.all(
      SEED_VOICES.map(
        async ({ file }) =>
          [
            file,
            await readFile(join(process.cwd(), 'src/lib/seed/voices', file)),
          ] as const,
      ),
    ),
  );
  const premiumUntil = new Date(now);
  premiumUntil.setUTCFullYear(
    premiumUntil.getUTCFullYear() + SEED_PREMIUM_YEARS,
  );

  await db.transaction(async (tx) => {
    const created = await tx
      .insert(users)
      .values(dummies.map(({ user }) => user))
      .onConflictDoNothing({ target: users.discordUserId })
      .returning({ id: users.id, discordUserId: users.discordUserId });
    const userIds = new Map(
      created.map(({ id, discordUserId }) => [discordUserId, id]),
    );
    const kept = dummies.filter(({ user }) => userIds.has(user.discordUserId));
    if (!kept.length) return;
    await tx
      .delete(moderationRestrictions)
      .where(
        inArray(moderationRestrictions.discordUserId, [...userIds.keys()]),
      );

    const createdProfiles = await tx
      .insert(profiles)
      .values(
        kept.map(({ user, profile }) => ({
          ...profile,
          userId: userIds.get(user.discordUserId) as string,
        })),
      )
      .returning({ id: profiles.id, userId: profiles.userId });
    const profileIds = new Map(
      createdProfiles.map(({ id, userId }) => [userId, id]),
    );
    await tx.insert(profileTargetLanguages).values(
      kept.flatMap(({ user, targetLanguages }) =>
        targetLanguages.map((target) => ({
          ...target,
          profileId: profileIds.get(
            userIds.get(user.discordUserId) as string,
          ) as string,
        })),
      ),
    );
    const premium = kept.filter((dummy) => dummy.premium);
    if (premium.length)
      await tx.insert(subscriptions).values(
        premium.map(({ user }) => ({
          userId: userIds.get(user.discordUserId) as string,
          stripeCustomerId: user.discordUserId,
          status: 'active',
          currentPeriodEnd: premiumUntil,
        })),
      );
    const voiced = kept.flatMap(({ user, voice }) =>
      voice ? [{ user, voice, clip: clips.get(voice.file) as Buffer }] : [],
    );
    if (voiced.length)
      await tx.insert(voiceIntros).values(
        voiced.map(({ user, voice, clip }) => ({
          userId: userIds.get(user.discordUserId) as string,
          mimeType: 'audio/webm',
          durationSeconds: voice.seconds,
          sizeBytes: clip.byteLength,
          data: clip.toString('base64'),
        })),
      );
  });
};

export const removeDummies = async (amount: number) => {
  const newest = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isSynthetic, true))
    .orderBy(desc(users.discordUserId))
    .limit(Math.min(amount, SEED_BATCH_SIZE));

  await db.transaction(async (tx) => {
    const removed = await tx
      .delete(users)
      .where(inArray(users.id, newest))
      .returning({ discordUserId: users.discordUserId });
    if (!removed.length) return;
    await tx.delete(moderationRestrictions).where(
      inArray(
        moderationRestrictions.discordUserId,
        removed.map(({ discordUserId }) => discordUserId),
      ),
    );
  });
};
