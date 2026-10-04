import 'server-only';

import { eq } from 'drizzle-orm';
import { isPremiumDiscordId } from '@/lib/entitlements';
import { type GrantUnit, grantExpiry } from '@/lib/premiumGrant';
import { db } from './client';
import { type Subscription, subscriptions, type User, users } from './schema';

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
  subscription.currentPeriodEnd !== null &&
  subscription.currentPeriodEnd.getTime() > Date.now();

export const hasActivePremiumGrant = ({
  premiumGrantedUntil,
}: Pick<User, 'premiumGrantedUntil'>) =>
  premiumGrantedUntil !== null && premiumGrantedUntil.getTime() > Date.now();

export const getPremiumSource = (
  user: Pick<User, 'premiumGrantedUntil'>,
  subscription: Subscription | null,
): 'free' | 'granted' | 'purchased' | 'both' => {
  const granted = hasActivePremiumGrant(user);
  const purchased =
    isSubscriptionActive(subscription) ||
    (subscription?.stripeSubscriptionId &&
      !['canceled', 'incomplete_expired'].includes(subscription.status));
  if (purchased) return granted ? 'both' : 'purchased';
  return granted ? 'granted' : 'free';
};

export const isPremiumAccount = (
  user: User,
  subscription: Subscription | null,
) =>
  isPremiumDiscordId(user.discordUserId) ||
  hasActivePremiumGrant(user) ||
  isSubscriptionActive(subscription);

export const getPremiumAccountByDiscordUserId = async (
  discordUserId: string,
) => {
  const [row] = await db
    .select({ user: users, subscription: subscriptions })
    .from(users)
    .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
    .where(eq(users.discordUserId, discordUserId))
    .limit(1);

  return row ?? null;
};

export const extendPremiumGrant = async (
  userId: string,
  amount: number,
  unit: GrantUnit,
  grantedBy: string,
) =>
  db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .for('update');
    if (!user) return null;
    const now = new Date();
    const from =
      user.premiumGrantedUntil && user.premiumGrantedUntil > now
        ? user.premiumGrantedUntil
        : now;
    const expiresAt = grantExpiry(from, amount, unit);
    await tx
      .update(users)
      .set({
        premiumGrantedUntil: expiresAt,
        premiumGrantedBy: grantedBy,
        updatedAt: now,
      })
      .where(eq(users.id, userId));
    return expiresAt;
  });

export const revokePremiumGrant = async (userId: string) =>
  db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .for('update');
    if (!user || !hasActivePremiumGrant(user)) return null;
    await tx
      .update(users)
      .set({
        premiumGrantedUntil: null,
        premiumGrantedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    return user.premiumGrantedUntil;
  });
