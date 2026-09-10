import 'server-only';

import { and, count, eq, gte } from 'drizzle-orm';
import { entitlementLimit, isPremiumDiscordId } from '@/lib/entitlements';
import { isSubscriptionActive } from './billing';
import { db } from './client';
import { profileBoosts, profiles, subscriptions, users } from './schema';

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
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .for('update');
    if (!user) return { error: 'Public profile required', status: 404 };
    const [subscription] = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    const premium =
      isPremiumDiscordId(user.discordUserId) ||
      isSubscriptionActive(subscription ?? null);
    if (!premium) return { error: 'Premium required', status: 403 };
    const [profile] = await tx
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .for('update');
    if (!profile?.isPublic)
      return { error: 'Public profile required', status: 404 };
    const now = new Date();
    const [usage] = await tx
      .select({ used: count() })
      .from(profileBoosts)
      .where(
        and(
          eq(profileBoosts.userId, userId),
          gte(profileBoosts.usedAt, monthStart(now)),
        ),
      );
    const remaining = Math.max(
      0,
      entitlementLimit('discovery.monthlyBoosts', premium) - usage.used,
    );
    if (profile.boostedUntil && profile.boostedUntil > now)
      return {
        error: 'Boost already active',
        status: 409,
        boostedUntil: profile.boostedUntil,
        remaining,
      };
    if (!remaining)
      return { error: 'No boosts remaining', status: 429, remaining: 0 };
    const boostedUntil = new Date(now.getTime() + BOOST_DURATION_MS);
    await tx
      .update(profiles)
      .set({ boostedUntil })
      .where(eq(profiles.id, profile.id));

    await tx.insert(profileBoosts).values({ userId });

    return { boostedUntil, remaining: remaining - 1 };
  });
};
