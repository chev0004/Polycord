import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from './client';
import { type Subscription, subscriptions, users } from './schema';

export const getSubscriptionByUserId = async (
  userId: string,
): Promise<Subscription | null> => {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  return subscription ?? null;
};

export const getSubscriptionByDiscordUserId = async (
  discordUserId: string,
): Promise<Subscription | null> => {
  const [row] = await db
    .select({ subscription: subscriptions })
    .from(subscriptions)
    .innerJoin(users, eq(subscriptions.userId, users.id))
    .where(eq(users.discordUserId, discordUserId))
    .limit(1);

  return row?.subscription ?? null;
};

export const upsertSubscriptionForUser = async (
  userId: string,
  values: {
    stripeCustomerId: string;
    stripeSubscriptionId?: string | null;
    status?: string;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
  },
) => {
  const [subscription] = await db
    .insert(subscriptions)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: { ...values, updatedAt: new Date() },
    })
    .returning();

  return subscription;
};

export const updateSubscriptionByCustomerId = async (
  stripeCustomerId: string,
  values: {
    stripeSubscriptionId?: string | null;
    status: string;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
  },
) => {
  const updated = await db
    .update(subscriptions)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(subscriptions.stripeCustomerId, stripeCustomerId))
    .returning({ id: subscriptions.id });

  return updated.length > 0;
};

export const isSubscriptionActive = (
  subscription: Subscription | null,
): boolean =>
  subscription !== null &&
  (subscription.status === 'active' || subscription.status === 'trialing') &&
  (subscription.currentPeriodEnd === null ||
    subscription.currentPeriodEnd.getTime() > Date.now());
