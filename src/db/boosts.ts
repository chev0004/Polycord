import 'server-only';

import { and, count, eq, gte } from 'drizzle-orm';
import { entitlementLimit } from '@/lib/entitlements';
import { db } from './client';
import { profileBoosts, profiles } from './schema';

export const BOOST_DURATION_MS = 24 * 60 * 60 * 1000;

const monthStart = (now = new Date()) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

export type BoostStatus = {
  remaining: number;
  boostedUntil: Date | null;
};

export const getBoostStatusForUser = async (
  userId: string,
  premium: boolean,
): Promise<BoostStatus> => {
  const limit = entitlementLimit('discovery.monthlyBoosts', premium);

  const [[usage], [profile]] = await Promise.all([
    db
      .select({ used: count() })
      .from(profileBoosts)
      .where(
        and(
          eq(profileBoosts.userId, userId),
          gte(profileBoosts.usedAt, monthStart()),
        ),
      ),
    db
      .select({ boostedUntil: profiles.boostedUntil })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1),
  ]);

  return {
    remaining: Math.max(0, limit - (usage?.used ?? 0)),
    boostedUntil:
      profile?.boostedUntil && profile.boostedUntil.getTime() > Date.now()
        ? profile.boostedUntil
        : null,
  };
};

export const boostProfileForUser = async (userId: string) => {
  const boostedUntil = new Date(Date.now() + BOOST_DURATION_MS);

  return db.transaction(async (tx) => {
    const [profile] = await tx
      .update(profiles)
      .set({ boostedUntil })
      .where(eq(profiles.userId, userId))
      .returning({ id: profiles.id });

    if (!profile) {
      return null;
    }

    await tx.insert(profileBoosts).values({ userId });

    return boostedUntil;
  });
};
