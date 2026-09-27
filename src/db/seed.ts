import 'server-only';

import { count, desc, eq, inArray, max } from 'drizzle-orm';
import { generateDummy, SEED_BATCH_SIZE, seedIndex } from '@/lib/seed/generate';
import { db } from './client';
import {
  moderationRestrictions,
  profiles,
  profileTargetLanguages,
  seedDatabase,
  users,
} from './schema';

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
