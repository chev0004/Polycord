import 'server-only';

import { eq } from 'drizzle-orm';
import { isPremiumDiscordId } from '@/lib/entitlements';
import { type GrantUnit, grantExpiry } from '@/lib/premiumGrant';
import { db } from './client';
import { type User, users } from './schema';

export const hasActivePremiumGrant = ({
  premiumGrantedUntil,
}: Pick<User, 'premiumGrantedUntil'>) =>
  premiumGrantedUntil !== null && premiumGrantedUntil.getTime() > Date.now();

export const isPremiumAccount = (
  user: Pick<User, 'discordUserId' | 'premiumGrantedUntil'>,
) => isPremiumDiscordId(user.discordUserId) || hasActivePremiumGrant(user);

export const getPremiumAccountByDiscordUserId = async (
  discordUserId: string,
) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.discordUserId, discordUserId))
    .limit(1);

  return user ?? null;
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
